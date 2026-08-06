//! Der "Ghost": ein durchklickbares Layer-Surface in Outputgroesse **je Monitor**. Waehrend des
//! Ziehens zeigt genau einer davon den Umriss der Uhr; die Uhr-Surface selbst bewegt sich nicht,
//! ihr Margin wird erst beim Loslassen **einmal** gesetzt.
//!
//! Warum ueberhaupt: KWin wendet Margin-Aenderungen an einer Layer-Surface nicht pro Frame an,
//! sondern sammelt sie und laesst sie ~200 ms spaeter in einem Schub landen (gemessen ueber
//! 512 ms, 137 Pointer-Events, 24 Margin-Befehle). Live-Ziehen ueber Margins ist dort damit
//! unerreichbar, unabhaengig von jedem Tuning. Das *Einblenden* einer neuen Surface ist davon
//! nicht betroffen: gemessen 25-56 ms von `show()` bis zum ersten gemalten Frame.

use super::linux::{
    gtk_layer_init_for_window, gtk_layer_set_anchor, gtk_layer_set_exclusive_zone,
    gtk_layer_set_keyboard_mode, gtk_layer_set_layer, gtk_layer_set_namespace,
    set_monitor_object, with_raw_gtk_window, Edge, KeyboardMode, Layer,
};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;
use tauri::{Emitter, Manager};

/// Die Labels aller moeglichen Ghost-Fenster; angelegt wird nur eines je vorhandenem Monitor.
///
/// Die Liste ist statisch, weil die Denylist des window-state-Plugins beim Bau des Builders
/// feststehen muss — da laeuft noch kein GTK, die Monitorzahl ist also noch unbekannt. Ein
/// Ghost, den das Plugin anfassen darf, kaeme beim naechsten Start als sichtbares
/// bildschirmfuellendes Overlay ohne laufenden Drag wieder, also lieber eine Obergrenze als
/// eine Luecke. Wer mehr als acht Schirme hat, sieht auf den weiteren keinen Umriss; alles
/// andere funktioniert dort weiter.
pub const LABELS: [&str; 8] = [
    "ghost-0", "ghost-1", "ghost-2", "ghost-3", "ghost-4", "ghost-5", "ghost-6", "ghost-7",
];

/// Alle tatsaechlich angelegten Ghost-Fenster. Bewusst aus der Fensterliste abgeleitet statt
/// aus einem eigenen Register: ein Register koennte mit der Wirklichkeit auseinanderlaufen, und
/// gerade beim Ausblenden darf keines uebersehen werden.
fn all(app: &tauri::AppHandle) -> Vec<(String, tauri::WebviewWindow)> {
    LABELS.iter().filter_map(|l| app.get_webview_window(l).map(|w| (l.to_string(), w))).collect()
}

/// Notbremse fuer **alle** Ghosts (`ghost_hide` geht ueber [`all`]). Jeder liegt auf der
/// OVERLAY-Ebene ueber allem, auch ueber Vollbild-Spielen — sichtbar haengenbleiben darf
/// keiner. Im Normalfall raeumen `pointerup`, `pointercancel` und
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

impl Rect {
    /// Der Umriss liegt immer auf genau einem Output. Die uebrigen Ghosts bekommen dieses
    /// Rechteck; `ghost.html` blendet bei Breite oder Hoehe 0 aus. Absichtlich per CSS und
    /// nicht per `hide()`: das Ein-/Ausblenden einer Surface kostet 25-56 ms, das Ueberqueren
    /// einer Monitorgrenze soll aber im selben Frame sichtbar sein.
    const HIDDEN: Rect = Rect { x: 0, y: 0, w: 0, h: 0, radius: 0.0 };
}

/// Legt je Monitor ein Ghost-Fenster an: unsichtbar, Outputgroesse (Vier-Kanten-Verankerung),
/// Layer `OVERLAY`, Keyboard-Mode `NONE`, leere Input-Region, per `gtk_layer_set_monitor` dem
/// eigenen Output zugewiesen.
///
/// Die Monitorliste ist eine Momentaufnahme des Starts. Ein spaeter angestecktes Display
/// bekommt keinen Ghost — dort bliebe der Umriss aus, waehrend Ziehen und Ablegen weiter
/// funktionieren. Ein Neustart holt es ein.
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
    let Some(display) = gtk::gdk::Display::default() else {
        eprintln!("fliq: kein GdkDisplay, Ziehen ohne Umriss");
        return;
    };
    let count = display.n_monitors().min(LABELS.len() as i32);
    for index in 0..count {
        let Some(monitor) = display.monitor(index) else {
            continue;
        };
        create_one(app, LABELS[index as usize], &monitor);
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
    // Startgroesse ist belanglos — die Vier-Kanten-Verankerung ueberschreibt sie mit der
    // Outputgroesse.
    .inner_size(400.0, 300.0)
    .build()
    {
        Ok(w) => w,
        Err(e) => {
            eprintln!("fliq: Ghost-Fenster {label} liess sich nicht bauen, kein Umriss dort: {e}");
            return;
        }
    };

    let Ok(gtk_win) = ghost.gtk_window() else {
        eprintln!("fliq: kein GtkWindow am Ghost {label}, kein Umriss dort");
        let _ = ghost.close();
        return;
    };

    let namespace = std::ffi::CString::new(format!("fliq-{label}")).unwrap();

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
        eprintln!("fliq: Ghost {label} nicht konfigurierbar, kein Umriss dort");
        let _ = ghost.close();
        return;
    }

    // Zuweisung an den eigenen Output, noch **vor** dem Realize — sonst legte der Compositor
    // alle Ghosts auf denselben Schirm und die uebrigen blieben leer.
    if !set_monitor_object(&ghost, monitor) {
        eprintln!("fliq: Ghost {label} liess sich keinem Output zuweisen");
    }

    // Leere *Input*-Shape (nicht Clip-Shape) => `wl_surface.set_input_region(leer)`: der Ghost
    // liegt ueber allem, faengt aber keinen einzigen Klick ab. Vor dem Realize gesetzt, GTK
    // wendet sie beim Realize an.
    gtk_win.input_shape_combine_region(Some(&gtk::cairo::Region::create()));
}

/// Blendet **alle** Ghosts ein und schickt Rechteck und Kontur der Uhr an den unter `label`.
/// Die uebrigen bekommen [`Rect::HIDDEN`] und zeigen nichts, bleiben aber bereit — beim
/// Ueberqueren einer Monitorgrenze reicht dann ein Event, kein `show()`.
///
/// Alle sind vollflaechig, transparent und durchklickbar (leere Input-Region); sichtbar ist nur
/// der eine Umriss. `ghost_hide` und der Sicherheits-Timeout raeumen entsprechend alle ab.
///
/// Reihenfolge: erst das Rechteck emittieren, dann `show()`. Andersherum erschiene der Umriss
/// fuer einen Frame an der Position des vorigen Ziehvorgangs.
#[tauri::command]
pub fn ghost_show(app: tauri::AppHandle, label: String, x: i32, y: i32, w: i32, h: i32, radius: f64) {
    for (l, win) in all(&app) {
        let rect = if l == label { Rect { x, y, w, h, radius } } else { Rect::HIDDEN };
        let _ = win.emit_to(l.as_str(), "ghost-rect", rect);
        let _ = win.show();
    }
    arm_safety_timeout(&app);
}

#[tauri::command]
pub fn ghost_hide(app: tauri::AppHandle) {
    GENERATION.fetch_add(1, Ordering::Relaxed);
    for (_, win) in all(&app) {
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
