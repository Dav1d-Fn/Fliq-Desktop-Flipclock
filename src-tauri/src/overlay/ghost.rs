//! The "ghost": a click-through, output-sized layer surface **per monitor** that can show a
//! copy of the clock while it is dragged.
//!
//! Why at all: a layer surface belongs to exactly one output. The clock moves by CSS inside its
//! full-output surface, but is cut off at the surface's edge. When it reaches onto another
//! monitor while dragging, that monitor's ghost draws the rest.
//!
//! Each ghost is a webview with its own WebKit process (~60 MB). They are therefore created on
//! the first drag and destroyed again after [`IDLE_LIFETIME`] without dragging, instead of
//! living for the whole session. While they exist, showing them costs 25-56 ms from `show()` to
//! the first painted frame, so all are shown at drag start and then driven by events only.

use super::linux::{
    gtk_layer_init_for_window, gtk_layer_set_anchor, gtk_layer_set_exclusive_zone,
    gtk_layer_set_keyboard_mode, gtk_layer_set_layer, gtk_layer_set_namespace,
    set_monitor_object, with_raw_gtk_window, Edge, KeyboardMode, Layer,
};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;
use tauri::{Emitter, Manager};

/// Labels of all possible ghost windows; one is created per existing monitor.
///
/// The list is static because the window-state plugin's denylist must be fixed when the builder
/// is built. No GTK runs then, so the monitor count is unknown. A ghost the plugin may touch
/// would come back on the next start as a visible full-screen overlay without a drag, so an
/// upper bound beats a gap. With more than eight screens the others show no clock copy;
/// everything else keeps working there.
///
/// The labels must match the glob `ghost-*` in `capabilities/ghost.json`. Without a matching
/// capability the ACL refuses `plugin:event|listen` and `ghost.html` never gets a `ghost-pos`;
/// that only rejects a JS promise, without a line on stderr, so it looks exactly like a ghost
/// that was never created.
pub const LABELS: [&str; 8] = [
    "ghost-0", "ghost-1", "ghost-2", "ghost-3", "ghost-4", "ghost-5", "ghost-6", "ghost-7",
];

/// All ghost windows that actually exist. Derived from the window list on purpose instead of an
/// own registry: a registry could drift from reality, and when hiding, none may be missed.
fn all(app: &tauri::AppHandle) -> Vec<(String, tauri::WebviewWindow)> {
    LABELS.iter().filter_map(|l| app.get_webview_window(l).map(|w| (l.to_string(), w))).collect()
}

/// Emergency brake for **all** ghosts (`ghost_hide` goes through [`all`]). Each lies on the
/// OVERLAY layer above everything, fullscreen games included; none may stay visible. Normally
/// `pointerup`, `pointercancel` and the effect cleanup in the frontend clean up; this timeout
/// covers the webview dying before any of those runs.
///
/// ponytail: this also caps the length of ONE drag. A drag over 30 s loses the clock copy;
/// dragging itself goes on, since the final position comes from the pointer, not the ghost. If
/// that ever matters: a keepalive from the frontend on every move.
const SAFETY_TIMEOUT: Duration = Duration::from_secs(30);

/// How long hidden ghosts are kept for the next drag before they are destroyed. Dragging is
/// rare, so their memory is better given back; a drag soon after the last one reuses them.
const IDLE_LIFETIME: Duration = Duration::from_secs(30);

/// Increased on every `ghost_show`/`ghost_hide`. A timeout only acts if nothing happened since,
/// otherwise it would cut off a newer drag.
static GENERATION: AtomicU64 = AtomicU64::new(0);

/// Where the ghost draws its copy of the clock (output-local). The frontend emits the same
/// shape per frame as `ghost-pos`.
#[derive(Clone, serde::Serialize)]
struct Pos {
    x: i32,
    y: i32,
    visible: bool,
}

impl Pos {
    /// Hidden by CSS, not by `hide()`: showing/hiding a surface costs 25-56 ms, but crossing a
    /// monitor border should be visible in the same frame.
    const HIDDEN: Pos = Pos { x: 0, y: 0, visible: false };
}

/// Creates the ghost window of every monitor that has none yet: invisible, output-sized
/// (anchored to all four edges), layer `OVERLAY`, keyboard mode `NONE`, empty input region,
/// assigned to its own output via `gtk_layer_set_monitor`.
///
/// Runs at drag start, so a monitor plugged in since the app started gets its ghost too. The
/// index matches `get_monitors`, which the frontend fetches at the same moment.
///
/// Must run on the GTK main thread (synchronous command), and the window must be built with
/// `visible(false)`: gtk-layer-shell needs its initialisation **before** the realize.
///
/// A freshly created ghost needs a few hundred ms until its page listens. Until then it shows
/// nothing; dragging and dropping are not affected, the copy just appears a little later.
fn create_missing(app: &tauri::AppHandle) {
    let Some(display) = gtk::gdk::Display::default() else {
        eprintln!("fliq: no GdkDisplay, dragging without a clock copy");
        return;
    };
    let count = display.n_monitors().min(LABELS.len() as i32);
    for index in 0..count {
        let label = LABELS[index as usize];
        if app.get_webview_window(label).is_some() {
            continue;
        }
        let Some(monitor) = display.monitor(index) else {
            continue;
        };
        create_one(app, label, &monitor);
    }
}

fn create_one(app: &tauri::AppHandle, label: &str, monitor: &gtk::gdk::Monitor) {
    use gtk::prelude::*;

    let ghost = match tauri::WebviewWindowBuilder::new(
        app,
        label,
        tauri::WebviewUrl::App("ghost.html".into()),
    )
    .visible(false)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .skip_taskbar(true)
    .resizable(false)
    // The start size does not matter; anchoring to all four edges replaces it with the output
    // size.
    .inner_size(400.0, 300.0)
    .build()
    {
        Ok(w) => w,
        Err(e) => {
            eprintln!("fliq: ghost window {label} could not be built, no clock copy there: {e}");
            return;
        }
    };

    let Ok(gtk_win) = ghost.gtk_window() else {
        eprintln!("fliq: no GtkWindow on ghost {label}, no clock copy there");
        let _ = ghost.close();
        return;
    };

    let namespace = std::ffi::CString::new(format!("fliq-{label}")).unwrap();

    // SAFETY: `ptr` is a valid GtkWindow for the duration of the closure, the order is the
    // documented one (init first), and thanks to `visible(false)` the window is not realized
    // yet. `namespace` outlives the call.
    let configured = with_raw_gtk_window(&ghost, |ptr| unsafe {
        gtk_layer_init_for_window(ptr);
        // Diagnostics only: a stuck full-screen surface should have a name in the compositor
        // instead of showing up as an anonymous layer surface.
        gtk_layer_set_namespace(ptr, namespace.as_ptr());
        gtk_layer_set_layer(ptr, Layer::Overlay);
        gtk_layer_set_keyboard_mode(ptr, KeyboardMode::None);
        gtk_layer_set_exclusive_zone(ptr, -1);
        // Anchored to all four edges => the compositor gives the full output size.
        for edge in [Edge::Top, Edge::Bottom, Edge::Left, Edge::Right] {
            gtk_layer_set_anchor(ptr, edge, 1);
        }
    });

    if configured.is_none() {
        eprintln!("fliq: ghost {label} not configurable, no clock copy there");
        let _ = ghost.close();
        return;
    }

    // Assigned to its own output **before** the realize; otherwise the compositor would put all
    // ghosts on the same screen and the others would stay empty.
    if !set_monitor_object(&ghost, monitor) {
        eprintln!("fliq: ghost {label} could not be assigned to an output");
    }

    // Empty *input* shape (not clip shape) => `wl_surface.set_input_region(empty)`: the ghost
    // lies above everything but catches not a single click. Set before the realize; GTK applies
    // it then.
    gtk_win.input_shape_combine_region(Some(&gtk::cairo::Region::create()));
}

/// Shows **all** ghosts, each empty at first. While dragging, the real clock draws on its own
/// output; where it reaches across a monitor border, the other output's ghost draws a copy
/// (`ghost-pos` from the frontend). Dropped on another monitor, the copy bridges the moment in
/// which the clock surface is moved there.
///
/// Order: clear first, then `show()`. The other way round, the copy would stand for one frame
/// where the previous drag left it.
#[tauri::command]
pub fn ghost_show(app: tauri::AppHandle) {
    create_missing(&app);
    for (l, win) in all(&app) {
        let _ = win.emit_to(l.as_str(), "ghost-pos", Pos::HIDDEN);
        let _ = win.show();
    }
    arm_safety_timeout(&app);
}

#[tauri::command]
pub fn ghost_hide(app: tauri::AppHandle) {
    let hidden_at = GENERATION.fetch_add(1, Ordering::Relaxed) + 1;
    for (_, win) in all(&app) {
        let _ = win.hide();
    }

    gtk::glib::timeout_add_once(IDLE_LIFETIME, move || {
        // A drag since then? It uses the ghosts, and its own ghost_hide schedules the next try.
        if GENERATION.load(Ordering::Relaxed) != hidden_at {
            return;
        }
        for (_, win) in all(&app) {
            let _ = win.destroy();
        }
    });
}

fn arm_safety_timeout(app: &tauri::AppHandle) {
    let armed_at = GENERATION.fetch_add(1, Ordering::Relaxed) + 1;
    let app = app.clone();
    gtk::glib::timeout_add_once(SAFETY_TIMEOUT, move || {
        // Another show/hide since then? Then this timeout is stale.
        if GENERATION.load(Ordering::Relaxed) != armed_at {
            return;
        }
        eprintln!(
            "fliq: ghost hidden by force after {}s without the drag ending",
            SAFETY_TIMEOUT.as_secs()
        );
        ghost_hide(app);
    });
}
