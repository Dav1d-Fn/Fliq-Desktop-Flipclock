//! Der "Ghost": ein zweites, durchklickbares Layer-Surface in Outputgroesse. Waehrend des
//! Ziehens zeigt es nur den Umriss der Uhr; die Uhr-Surface selbst bewegt sich nicht, ihr
//! Margin wird erst beim Loslassen **einmal** gesetzt.
//!
//! Warum ueberhaupt: KWin wendet Margin-Aenderungen an einer Layer-Surface nicht pro Frame an,
//! sondern sammelt sie und laesst sie ~200 ms spaeter in einem Schub landen (gemessen ueber
//! 512 ms, 137 Pointer-Events, 24 Margin-Befehle). Live-Ziehen ueber Margins ist dort damit
//! unerreichbar, unabhaengig von jedem Tuning. Das *Einblenden* einer neuen Surface ist davon
//! nicht betroffen: gemessen 25-56 ms von `show()` bis zum ersten gemalten Frame.

use super::linux::{
    gtk_layer_init_for_window, gtk_layer_set_anchor, gtk_layer_set_exclusive_zone,
    gtk_layer_set_keyboard_mode, gtk_layer_set_layer, gtk_layer_set_namespace,
    with_raw_gtk_window, Edge, KeyboardMode, Layer,
};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;
use tauri::{Emitter, Manager};

pub const LABEL: &str = "ghost";

/// Notbremse. Der Ghost liegt auf der OVERLAY-Ebene ueber allem, auch ueber Vollbild-Spielen —
/// sichtbar haengenbleiben darf er nie. Im Normalfall raeumen `pointerup`, `pointercancel` und
/// der Effect-Cleanup im Frontend auf; dieser Timeout deckt ab, was passiert, wenn der Webview
/// vorher stirbt und keiner dieser Pfade mehr laeuft.
///
/// ponytail: das ist zugleich eine Obergrenze fuer die Dauer EINES Ziehvorgangs. Ein Drag ueber
/// 30 s verliert den Umriss; das Ziehen selbst laeuft weiter, denn der finale Margin kommt aus
/// den Zeigerkoordinaten, nicht aus dem Ghost. Falls das je stoert: Keepalive vom Frontend, das
/// pro Bewegung nachlegt.
const SAFETY_TIMEOUT: Duration = Duration::from_secs(30);

/// Wird bei jedem `ghost_show`/`ghost_hide` erhoeht. Ein Sicherheits-Timeout blendet nur aus,
/// wenn seither nichts passiert ist — sonst wuergte er einen laengst neuen Drag ab.
static GENERATION: AtomicU64 = AtomicU64::new(0);

/// Was der Ghost zum Zeichnen braucht. Dieselbe Form emittiert das Frontend pro Frame; der
/// Ghost setzt bei jedem Event alle Felder, damit es nur *eine* Nachrichtenform gibt.
#[derive(Clone, serde::Serialize)]
struct Rect {
    x: i32,
    y: i32,
    w: i32,
    h: i32,
    radius: f64,
}

/// Legt das Ghost-Fenster an: unsichtbar, Outputgroesse (Vier-Kanten-Verankerung), Layer
/// `OVERLAY`, Keyboard-Mode `NONE`, leere Input-Region.
///
/// Muss im `setup`-Hook laufen (GTK-Main-Thread), und das Fenster muss mit `visible(false)`
/// gebaut werden: gtk-layer-shell verlangt die Initialisierung **vor** dem Realize.
///
/// Bewusst **kein** Pre-Warm (einmaliges Zeigen beim Start, um die 25-56 ms des ersten
/// `show()` zu sparen): das machte aus einer seltenen, vom Nutzer ausgeloesten, kurzen
/// Sichtbarkeit eine bedingungslose bei jedem Start. Sollte die leere Input-Region auf einem
/// anderen Compositor je nicht greifen, waere der Preis dafuer ein bildschirmfuellender
/// Klick-Fresser beim Programmstart — ohne `pointerup`, das ihn beendet. Der Umriss darf dafuer
/// beim allerersten Drag einer Sitzung ein bis drei Frames spaet erscheinen.
pub fn create(app: &tauri::AppHandle) {
    use gtk::prelude::*;

    let ghost = match tauri::WebviewWindowBuilder::new(
        app,
        LABEL,
        tauri::WebviewUrl::App("ghost.html".into()),
    )
    .visible(false)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .skip_taskbar(true)
    .resizable(false)
    // Startgroesse ist belanglos — die Vier-Kanten-Verankerung ueberschreibt sie mit der
    // Outputgroesse.
    .inner_size(400.0, 300.0)
    .build()
    {
        Ok(w) => w,
        Err(e) => {
            eprintln!("fliq: Ghost-Fenster liess sich nicht bauen, Ziehen ohne Umriss: {e}");
            return;
        }
    };

    let Ok(gtk_win) = ghost.gtk_window() else {
        eprintln!("fliq: kein GtkWindow am Ghost, Ziehen ohne Umriss");
        let _ = ghost.close();
        return;
    };

    let namespace = std::ffi::CString::new("fliq-ghost").unwrap();

    // SAFETY: `ptr` ist ein gueltiges GtkWindow fuer die Dauer der Closure, die Reihenfolge ist
    // die dokumentierte (init zuerst), und das Fenster ist wegen `visible(false)` noch nicht
    // realisiert. `namespace` lebt laenger als der Aufruf.
    let configured = with_raw_gtk_window(&ghost, |ptr| unsafe {
        gtk_layer_init_for_window(ptr);
        // Nur zur Diagnose: eine haengengebliebene Vollbild-Surface soll im Compositor einen
        // Namen haben und nicht als anonymes Layer-Surface dastehen.
        gtk_layer_set_namespace(ptr, namespace.as_ptr());
        gtk_layer_set_layer(ptr, Layer::Overlay);
        gtk_layer_set_keyboard_mode(ptr, KeyboardMode::None);
        gtk_layer_set_exclusive_zone(ptr, -1);
        // Alle vier Kanten verankert => der Compositor gibt die volle Outputgroesse.
        for edge in [Edge::Top, Edge::Bottom, Edge::Left, Edge::Right] {
            gtk_layer_set_anchor(ptr, edge, 1);
        }
    });

    if configured.is_none() {
        eprintln!("fliq: Ghost nicht konfigurierbar, Ziehen ohne Umriss");
        let _ = ghost.close();
        return;
    }

    // Leere *Input*-Shape (nicht Clip-Shape) => `wl_surface.set_input_region(leer)`: der Ghost
    // liegt ueber allem, faengt aber keinen einzigen Klick ab. Vor dem Realize gesetzt, GTK
    // wendet sie beim Realize an.
    gtk_win.input_shape_combine_region(Some(&gtk::cairo::Region::create()));
}

/// Blendet den Ghost ein und teilt ihm Rechteck und Kontur der Uhr mit.
///
/// Reihenfolge: erst das Rechteck emittieren, dann `show()`. Andersherum erschiene der Umriss
/// fuer einen Frame an der Position des vorigen Ziehvorgangs.
#[tauri::command]
pub fn ghost_show(app: tauri::AppHandle, x: i32, y: i32, w: i32, h: i32, radius: f64) {
    let Some(win) = app.get_webview_window(LABEL) else {
        return;
    };
    let _ = win.emit_to(LABEL, "ghost-rect", Rect { x, y, w, h, radius });
    let _ = win.show();
    arm_safety_timeout(&app);
}

#[tauri::command]
pub fn ghost_hide(app: tauri::AppHandle) {
    GENERATION.fetch_add(1, Ordering::Relaxed);
    if let Some(win) = app.get_webview_window(LABEL) {
        let _ = win.hide();
    }
}

fn arm_safety_timeout(app: &tauri::AppHandle) {
    let armed_at = GENERATION.fetch_add(1, Ordering::Relaxed) + 1;
    let app = app.clone();
    gtk::glib::timeout_add_once(SAFETY_TIMEOUT, move || {
        // Seither ein weiteres show/hide? Dann ist dieser Timeout veraltet.
        if GENERATION.load(Ordering::Relaxed) != armed_at {
            return;
        }
        eprintln!(
            "fliq: Ghost nach {}s ohne Ende des Ziehvorgangs zwangsweise ausgeblendet",
            SAFETY_TIMEOUT.as_secs()
        );
        ghost_hide(app);
    });
}
