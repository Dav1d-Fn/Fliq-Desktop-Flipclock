//! Linux-spezifischer Teil des Overlays: Compositor-Probe und Fensterkonfiguration.

use crate::overlay::OverlayMode;
use std::os::raw::{c_int, c_void};
use std::time::Duration;
use wayland_client::{
    globals::{registry_queue_init, GlobalListContents},
    protocol::wl_registry,
    Connection, Dispatch, QueueHandle,
};

const PROBE_TIMEOUT: Duration = Duration::from_millis(500);

/// Der Probe braucht keinen Zustand — er liest nur die Global-Liste, die
/// `registry_queue_init` bereits gesammelt hat.
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

/// Fragt den laufenden Compositor, ob er `zwlr_layer_shell_v1` anbietet.
///
/// Laeuft bewusst **vor** jeder GTK-Initialisierung, damit die Wahl des GDK-Backends
/// noch offen ist. Jeder Fehler bedeutet "nicht verfuegbar" — im Zweifel der Modus,
/// der ueberall laeuft. Das schliesst einen haengenden Compositor/ein totes Socket ein: der
/// eigentliche Roundtrip laeuft in [`super::with_timeout`], damit ein fehlendes Ende der
/// Verbindung den App-Start nicht blockiert.
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

// Direkte Bindung an die System-Bibliothek gtk-layer-shell (GTK3).
// Die Rust-Crate dafuer ist auf crates.io als UNMAINTAINED markiert.
extern "C" {
    fn gtk_layer_is_supported() -> c_int;
    pub(super) fn gtk_layer_init_for_window(window: *mut c_void);
    pub(super) fn gtk_layer_set_layer(window: *mut c_void, layer: Layer);
    pub(super) fn gtk_layer_set_anchor(window: *mut c_void, edge: Edge, anchor_to_edge: c_int);
    fn gtk_layer_set_margin(window: *mut c_void, edge: Edge, margin_size: c_int);
    pub(super) fn gtk_layer_set_keyboard_mode(window: *mut c_void, mode: KeyboardMode);
    pub(super) fn gtk_layer_set_exclusive_zone(window: *mut c_void, exclusive_zone: c_int);
    pub(super) fn gtk_layer_set_namespace(window: *mut c_void, name_space: *const std::os::raw::c_char);
}

/// Ruft `f` mit dem Rohzeiger auf das GtkWindow hinter einem Tauri-Fenster auf.
///
/// Der Zeiger wird bewusst **nicht** zurueckgegeben. Zwei Dinge muessen laenger leben als er:
/// die `gtk_window()`-Referenz (eigene Refcount-Referenz auf das GObject) und der `Stash` aus
/// `to_glib_none()`. Beide sind hier lokal und wuerden am Ende der Funktion fallen — ein
/// zurueckgegebener Zeiger waere ab da formal baumelnd. Als Closure-Argument ist er gueltig,
/// solange `f` laeuft.
///
/// `f` gibt bewusst nichts zurueck: ein generischer Rueckgabetyp koennte den Rohzeiger selbst
/// nach draussen reichen und die Eindaemmung aushebeln, die dieser Helfer verspricht. `Some(())`
/// heisst nur "es gab ein GtkWindow und `f` lief".
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

/// Konfiguriert das Fenster fuer den gewaehlten Modus. Muss laufen, **bevor** das Fenster
/// realisiert wird — deshalb startet das Hauptfenster mit `"visible": false`.
///
/// Gibt den Modus zurueck, der **tatsaechlich** eingerichtet wurde. `mode` sagt, was versucht
/// wird; der Rueckgabewert sagt, was daraus wurde. Jeder Fallback liefert `X11`, damit der
/// Zustand, den das Frontend spaeter sieht, nicht luegt: ein als `layer-shell` gemeldetes,
/// in Wahrheit aber X11-Fenster wuerde das Ziehen per `startDragging` unterdruecken und
/// stattdessen auf `set_margin` setzen, das dort wirkungslos ist — die Uhr waere unbewegbar.
#[must_use]
pub fn apply(
    window: &tauri::WebviewWindow,
    mode: OverlayMode,
    margin_x: i32,
    margin_y: i32,
) -> OverlayMode {
    match mode {
        OverlayMode::X11 => {
            apply_x11(window);
            OverlayMode::X11
        }
        OverlayMode::LayerShell => {
            // SAFETY: parameterloser Query-Call in libgtk-layer-shell, kein Zeiger im Spiel.
            if unsafe { gtk_layer_is_supported() } == 0 {
                // Praktisch unerreichbar, weil der Registry-Probe die Unterstuetzung bereits
                // festgestellt hat. Ein sichtbares Widget ohne Always-on-Top ist trotzdem
                // besser als ein unsichtbares.
                eprintln!("fliq: layer-shell laut GTK nicht unterstuetzt, nutze X11-Verhalten");
                apply_x11(window);
                return OverlayMode::X11;
            }

            // SAFETY: `ptr` ist ein gueltiges GtkWindow und bleibt es fuer die Dauer der
            // Closure; alle Aufrufe sind die dokumentierte Reihenfolge (init zuerst).
            let configured = with_raw_gtk_window(window, |ptr| unsafe {
                gtk_layer_init_for_window(ptr);
                gtk_layer_set_layer(ptr, Layer::Overlay);
                gtk_layer_set_keyboard_mode(ptr, KeyboardMode::None);
                // -1 heisst: fremde exclusive zones ignorieren. Sonst verschoebe ein
                // erscheinendes Panel das Widget.
                gtk_layer_set_exclusive_zone(ptr, -1);
                gtk_layer_set_anchor(ptr, Edge::Top, 1);
                gtk_layer_set_anchor(ptr, Edge::Left, 1);
                gtk_layer_set_margin(ptr, Edge::Top, margin_y);
                gtk_layer_set_margin(ptr, Edge::Left, margin_x);
            });

            if configured.is_none() {
                eprintln!("fliq: kein GtkWindow erreichbar, Overlay nicht konfiguriert");
                return OverlayMode::X11;
            }
            OverlayMode::LayerShell
        }
    }
}

fn apply_x11(window: &tauri::WebviewWindow) {
    use gtk::prelude::GtkWindowExt;

    let Ok(gtk_win) = window.gtk_window() else {
        eprintln!("fliq: kein GtkWindow erreichbar, Overlay nicht konfiguriert");
        return;
    };
    gtk_win.set_keep_above(true);
    gtk_win.set_skip_taskbar_hint(true);
    gtk_win.set_skip_pager_hint(true);
    // Bewusst KEIN WindowTypeHint::Dock: Dock-Fenster lassen sich vom WM nicht ziehen,
    // und `startDragging` ist auf diesem Pfad die Bedienung.
}

/// Verschiebt ein bereits konfiguriertes Layer-Surface. Auf dem X11-Pfad wirkungslos —
/// dort positioniert `startDragging` das Fenster.
pub fn set_margin(window: &tauri::WebviewWindow, margin_x: i32, margin_y: i32) {
    // SAFETY: wie in `apply` — gueltiger GtkWindow-Zeiger fuer die Dauer der Closure.
    let _ = with_raw_gtk_window(window, |ptr| unsafe {
        gtk_layer_set_margin(ptr, Edge::Top, margin_y);
        gtk_layer_set_margin(ptr, Edge::Left, margin_x);
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Diagnostischer Test, kein Teil der normalen Suite: verbindet sich mit dem echten
    /// Compositor. Auf dem Entwicklungssystem (KDE Plasma, Wayland) muss dies `true` melden,
    /// da `wayland-info` `zwlr_layer_shell_v1` bestaetigt.
    ///
    /// Ausfuehren mit: `cargo test -- --ignored --nocapture`
    #[test]
    #[ignore]
    fn probe_reports_layer_shell_on_this_machine() {
        println!("layer_shell_available() = {}", layer_shell_available());
    }
}
