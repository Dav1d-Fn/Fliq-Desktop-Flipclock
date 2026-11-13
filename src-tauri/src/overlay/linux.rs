//! Linux part of the overlay: compositor probe, window configuration, monitors.

use crate::overlay::OverlayMode;
use std::os::raw::{c_int, c_void};
use std::time::Duration;
use wayland_client::{
    globals::{registry_queue_init, GlobalListContents},
    protocol::wl_registry,
    Connection, Dispatch, QueueHandle,
};

const PROBE_TIMEOUT: Duration = Duration::from_millis(500);

/// The probe needs no state; it only reads the global list `registry_queue_init` has collected.
struct Probe;

impl Dispatch<wl_registry::WlRegistry, GlobalListContents> for Probe {
    fn event(
        _: &mut Self,
        _: &wl_registry::WlRegistry,
        _: wl_registry::Event,
        _: &GlobalListContents,
        _: &Connection,
        _: &QueueHandle<Self>,
    ) {
    }
}

/// Asks the running compositor whether it offers `zwlr_layer_shell_v1`.
///
/// Runs deliberately **before** any GTK initialisation, while the GDK backend can still be
/// chosen. Every error means "not available": when in doubt, the mode that works everywhere.
/// That includes a hanging compositor or a dead socket: the roundtrip runs in
/// [`super::with_timeout`], so a missing answer cannot block the app start.
pub fn layer_shell_available() -> bool {
    super::with_timeout(PROBE_TIMEOUT, || {
        let Ok(conn) = Connection::connect_to_env() else {
            return false;
        };
        let Ok((globals, _queue)) = registry_queue_init::<Probe>(&conn) else {
            return false;
        };
        globals
            .contents()
            .with_list(|list| list.iter().any(|g| g.interface == "zwlr_layer_shell_v1"))
    })
}

#[repr(C)]
#[allow(dead_code)]
pub(super) enum Layer {
    Background = 0,
    Bottom = 1,
    Top = 2,
    Overlay = 3,
}

#[repr(C)]
#[allow(dead_code)]
pub(super) enum Edge {
    Left = 0,
    Right = 1,
    Top = 2,
    Bottom = 3,
}

#[repr(C)]
#[allow(dead_code)]
pub(super) enum KeyboardMode {
    None = 0,
    Exclusive = 1,
    OnDemand = 2,
}

// Direct binding to the system library gtk-layer-shell (GTK3).
// The Rust crate for it is marked UNMAINTAINED on crates.io.
extern "C" {
    fn gtk_layer_is_supported() -> c_int;
    pub(super) fn gtk_layer_init_for_window(window: *mut c_void);
    pub(super) fn gtk_layer_set_layer(window: *mut c_void, layer: Layer);
    pub(super) fn gtk_layer_set_anchor(window: *mut c_void, edge: Edge, anchor_to_edge: c_int);
    pub(super) fn gtk_layer_set_keyboard_mode(window: *mut c_void, mode: KeyboardMode);
    pub(super) fn gtk_layer_set_exclusive_zone(window: *mut c_void, exclusive_zone: c_int);
    pub(super) fn gtk_layer_set_namespace(window: *mut c_void, name_space: *const std::os::raw::c_char);
    /// Second parameter is a `GdkMonitor*`. Per probe (KWin/Plasma 6.7.3) the call also works on
    /// an already mapped surface within <= 16 ms, without hide/re-show. That explicitly does
    /// **not** hold for margins: KWin collects those and applies them ~200 ms later in one batch.
    /// That is why the clock positions itself by CSS, not by margin.
    fn gtk_layer_set_monitor(window: *mut c_void, monitor: *mut c_void);
}

/// Global geometry of an output, as the frontend needs it for converting coordinates.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct MonitorInfo {
    /// Key in `LinuxConfig::monitor`. See [`monitors`] for how it is built.
    pub id: String,
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
    /// Currently assumed to be 1 everywhere (true for both outputs of the development machine).
    /// With scale != 1 the ghost copy would sit offset. Known simplification; the value is sent
    /// along so it can be used later without changing the interface.
    // ponytail: scale is ignored, not applied. Add it once an output has scale != 1.
    pub scale: i32,
}

/// Builds the name a monitor is stored under in `linux.json`.
///
/// Manufacturer + model from the EDID, because that survives a restart and re-plugging; the
/// geometry would not. Two identical screens report the same name, then the index decides,
/// otherwise both would point to the same ghost.
fn monitor_id(monitor: &gtk::gdk::Monitor, index: i32, taken: &[MonitorInfo]) -> String {
    use gtk::prelude::MonitorExt;

    let name = format!(
        "{} {}",
        monitor.manufacturer().unwrap_or_default(),
        monitor.model().unwrap_or_default()
    );
    let name = name.trim();
    let base =
        if name.is_empty() { format!("monitor-{index}") } else { name.to_string() };
    if taken.iter().any(|m| m.id == base) {
        format!("{base} #{index}")
    } else {
        base
    }
}

/// All outputs in GDK order. The index in this list is also the index of the matching ghost
/// window (`ghost::LABELS`); both count the same enumeration.
///
/// Main-thread-only (GDK). Synchronous Tauri commands fulfil that, async ones do not.
///
/// Deliberately **not** via `gdk_monitor_is_primary()`: under Wayland that returns `0` for every
/// monitor, a search for the primary one would never find one.
pub fn monitors() -> Vec<MonitorInfo> {
    use gtk::prelude::MonitorExt;

    let Some(display) = gtk::gdk::Display::default() else {
        return Vec::new();
    };
    let mut out: Vec<MonitorInfo> = Vec::new();
    for i in 0..display.n_monitors() {
        let Some(monitor) = display.monitor(i) else {
            continue;
        };
        let g = monitor.geometry();
        let id = monitor_id(&monitor, i, &out);
        out.push(MonitorInfo {
            id,
            x: g.x(),
            y: g.y(),
            w: g.width(),
            h: g.height(),
            scale: monitor.scale_factor(),
        });
    }
    out
}

/// Moves a layer surface to the monitor with this `id`. `false` if it does not exist (any
/// more); the caller then leaves the surface where it is.
///
/// Must run after `gtk_layer_init_for_window`. Before the realize is allowed (ghost creation
/// does that), after it too, per probe.
pub fn set_monitor(window: &tauri::WebviewWindow, monitor_id: &str) -> bool {
    let Some(display) = gtk::gdk::Display::default() else {
        return false;
    };
    let Some(index) = monitors().iter().position(|m| m.id == monitor_id) else {
        return false;
    };
    let Some(monitor) = display.monitor(index as i32) else {
        return false;
    };
    set_monitor_object(window, &monitor)
}

pub(super) fn set_monitor_object(
    window: &tauri::WebviewWindow,
    monitor: &gtk::gdk::Monitor,
) -> bool {
    use gtk::glib::translate::ToGlibPtr;

    // As in `with_raw_gtk_window`: keep the stash alive while the pointer is used.
    let stash = monitor.to_glib_none();
    let mon_ptr: *mut gtk::gdk::ffi::GdkMonitor = stash.0;
    // SAFETY: valid GtkWindow for the duration of the closure, valid GdkMonitor for the duration
    // of this function, and `gtk_layer_init_for_window` already ran on the window.
    with_raw_gtk_window(window, |ptr| unsafe {
        gtk_layer_set_monitor(ptr, mon_ptr as *mut c_void)
    })
    .is_some()
}

/// Calls `f` with the raw pointer to the GtkWindow behind a Tauri window.
///
/// The pointer is deliberately **not** returned. Two things must outlive it: the
/// `gtk_window()` reference (its own refcount on the GObject) and the `Stash` from
/// `to_glib_none()`. Both are local here and drop at the end of the function; a returned
/// pointer would formally dangle from then on. As a closure argument it is valid while `f` runs.
///
/// `f` deliberately returns nothing: a generic return type could hand the raw pointer itself
/// out and defeat the containment this helper promises. `Some(())` only means "there was a
/// GtkWindow and `f` ran".
pub(super) fn with_raw_gtk_window(
    window: &tauri::WebviewWindow,
    f: impl FnOnce(*mut c_void),
) -> Option<()> {
    use gtk::glib::translate::ToGlibPtr;
    use gtk::prelude::Cast;

    let gtk_win = window.gtk_window().ok()?;
    let stash = gtk_win.upcast_ref::<gtk::Window>().to_glib_none();
    let ptr: *mut gtk::ffi::GtkWindow = stash.0;
    f(ptr as *mut c_void);
    Some(())
}

/// Configures the window for the chosen mode. Must run **before** the window is realized,
/// which is why the main window starts with `"visible": false`.
///
/// Returns the mode **actually** set up. `mode` says what is attempted, the return value what
/// came of it. Every fallback returns `X11`, so the state the frontend sees does not lie: a
/// window reported as `layer-shell` that is really X11 would suppress dragging by
/// `startDragging` and instead move the clock by CSS in a window that is not full-output.
#[must_use]
pub fn apply(window: &tauri::WebviewWindow, mode: OverlayMode) -> OverlayMode {
    match mode {
        OverlayMode::X11 => {
            apply_x11(window);
            OverlayMode::X11
        }
        OverlayMode::LayerShell => {
            // SAFETY: parameterless query call into libgtk-layer-shell, no pointer involved.
            if unsafe { gtk_layer_is_supported() } == 0 {
                // Practically unreachable, the registry probe already found support. A visible
                // widget without always-on-top is still better than an invisible one.
                eprintln!("fliq: GTK says layer-shell is not supported, using X11 behaviour");
                apply_x11(window);
                return OverlayMode::X11;
            }

            // SAFETY: `ptr` is a valid GtkWindow for the duration of the closure; the calls follow
            // the documented order (init first).
            let configured = with_raw_gtk_window(window, |ptr| unsafe {
                gtk_layer_init_for_window(ptr);
                gtk_layer_set_layer(ptr, Layer::Overlay);
                gtk_layer_set_keyboard_mode(ptr, KeyboardMode::None);
                // -1 means: ignore other exclusive zones. Otherwise an appearing panel would push
                // the widget away.
                gtk_layer_set_exclusive_zone(ptr, -1);
                // All four edges: the surface is as large as the output and the clock sits in it
                // by CSS, so it moves smoothly while dragging (KWin applies margin changes only in
                // ~200 ms batches). Only the clock takes clicks (`set_input_region`), the rest is
                // click-through.
                for edge in [Edge::Top, Edge::Bottom, Edge::Left, Edge::Right] {
                    gtk_layer_set_anchor(ptr, edge, 1);
                }
            });

            if configured.is_none() {
                eprintln!("fliq: no GtkWindow reachable, overlay not configured");
                return OverlayMode::X11;
            }
            OverlayMode::LayerShell
        }
    }
}

fn apply_x11(window: &tauri::WebviewWindow) {
    use gtk::prelude::GtkWindowExt;

    let Ok(gtk_win) = window.gtk_window() else {
        eprintln!("fliq: no GtkWindow reachable, overlay not configured");
        return;
    };
    gtk_win.set_keep_above(true);
    gtk_win.set_skip_taskbar_hint(true);
    gtk_win.set_skip_pager_hint(true);
    // Deliberately NO WindowTypeHint::Dock: most WMs do not let dock windows be dragged, and
    // `startDragging` is how this path is operated.
}

/// Limits the window's click area to the clock's rectangle (window coordinates).
///
/// Under GTK/WebKitGTK the window is often larger than the clock (minimum size, measured 200 px
/// height), and on the layer-shell path it spans the output. The transparent rest would catch
/// clicks meant for the window underneath. Set on the widget rather than the GdkWindow, because
/// GTK keeps the shape there and reapplies it on every realize.
pub fn set_input_region(window: &tauri::WebviewWindow, x: i32, y: i32, w: i32, h: i32) {
    use gtk::prelude::WidgetExt;

    let Ok(gtk_win) = window.gtk_window() else {
        return;
    };
    let region = gtk::cairo::Region::create_rectangle(&gtk::cairo::RectangleInt::new(x, y, w, h));
    gtk_win.input_shape_combine_region(Some(&region));
}

/// Tells the page when the pointer leaves the clock surface (event `pointer-left`).
///
/// WebKitGTK sends no `mouseout`/`pointerleave` when the pointer leaves the input region of the
/// layer-shell surface (checked on KWin): the page keeps its last hover state. GTK itself does get
/// the leave, so it is passed on from here. The clock's right-click menu closes on it.
pub fn report_pointer_leave(window: &tauri::WebviewWindow) {
    let target = window.clone();
    let _ = window.with_webview(move |wv| {
        use gtk::prelude::WidgetExt;
        use tauri::Emitter;

        wv.inner().connect_leave_notify_event(move |_, event| {
            // Moves between the webview's own child windows are no real leave.
            if event.detail() != gtk::gdk::NotifyType::Inferior {
                let _ = target.emit_to(target.label(), "pointer-left", ());
            }
            gtk::glib::Propagation::Proceed
        });
    });
}

/// Reloads the page when the WebKit process dies.
///
/// Without this the window keeps its last frame: the clock looks frozen and reacts to nothing.
/// Triggered e.g. by a GPU reset (amdgpu "context is lost" on 2026-11-08 in the journal,
/// followed by SIGABRT in WebKitWebProcess).
pub fn reload_on_crash(window: &tauri::WebviewWindow) {
    let _ = window.with_webview(|wv| {
        use webkit2gtk::WebViewExt;

        wv.inner().connect_web_process_terminated(|view, reason| {
            eprintln!("fliq: WebKit process ended ({reason:?}), reloading");
            view.reload();
        });
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Diagnostic test, not part of the normal suite: connects to the real compositor. On the
    /// development system (KDE Plasma, Wayland) it must report `true`, as `wayland-info`
    /// confirms `zwlr_layer_shell_v1`.
    ///
    /// Run with: `cargo test -- --ignored --nocapture`
    #[test]
    #[ignore]
    fn probe_reports_layer_shell_on_this_machine() {
        println!("layer_shell_available() = {}", layer_shell_available());
    }
}
