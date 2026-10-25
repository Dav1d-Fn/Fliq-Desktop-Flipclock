pub mod overlay;
#[cfg(target_os = "linux")]
pub mod tuxhub;

// Window definition for the styling menu
#[tauri::command]
async fn open_stylingmenu_window(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;

    if let Some(existing) = app.get_webview_window("Styling") {
        let _ = existing.set_focus();
        return Ok(());
    }

    tauri::WebviewWindowBuilder::new(
        &app,
        "Styling", /* the unique window label */
        tauri::WebviewUrl::App("stylingMenu.html".into()),
    )
    .inner_size(900.0, 500.0)
    .resizable(true)
    .title("Styling")
    .build()
    .map(|_| ())
    .map_err(|e| e.to_string())
}
 
/// Gewaehlter Modus und persistierte Werte, erreichbar aus den Commands.
pub struct OverlayState {
    pub mode: overlay::OverlayMode,
    pub config: std::sync::Mutex<overlay::LinuxConfig>,
}

#[derive(serde::Serialize)]
pub struct OverlayInfo {
    pub mode: String,
    pub margin_x: i32,
    pub margin_y: i32,
    /// Die gespeicherte Praeferenz aus `linux.json` ("auto"/"layer-shell"/"x11"),
    /// nicht der tatsaechlich wirksame Modus. Damit kann das Settings-Menü das
    /// Dropdown nach einem Neustart korrekt vorbelegen.
    pub preference: String,
    /// Der Output, an dem die Uhr haengt (`get_monitors().id`). `None` heisst: kein
    /// Layer-Shell oder noch kein Monitor bekannt — dann rechnet das Frontend gegen den
    /// Bildschirm, den es kennt.
    pub monitor: Option<String>,
}

#[tauri::command]
fn get_overlay_state(state: tauri::State<'_, OverlayState>) -> OverlayInfo {
    let cfg = state.config.lock().unwrap();
    OverlayInfo {
        #[cfg(target_os = "linux")]
        mode: state.mode.as_str().to_string(),
        #[cfg(not(target_os = "linux"))]
        mode: "native".to_string(),
        margin_x: cfg.margin_x,
        margin_y: cfg.margin_y,
        preference: cfg.overlay_mode.as_str().to_string(),
        monitor: cfg.monitor.clone(),
    }
}

/// Globale Geometrie aller Outputs, damit das Frontend waehrend des Ziehens zwischen globalen
/// und output-lokalen Koordinaten umrechnen kann. Reihenfolge und Index entsprechen den
/// Ghost-Fenstern (`ghost::LABELS`).
///
/// Bewusst **synchron**: GDK ist main-thread-only, und nur synchrone Commands laufen dort.
#[cfg(target_os = "linux")]
#[tauri::command]
fn get_monitors() -> Vec<overlay::linux::MonitorInfo> {
    overlay::linux::monitors()
}

/// Beim Loslassen: Output und Position in einem Zug. Ersetzt auf dem Layer-Shell-Pfad das
/// bisherige `set_overlay_margin(persist: true)`.
///
/// `x`/`y` sind **output-lokal** — Layer-Shell-Margins zaehlen relativ zum eigenen Output.
/// Deshalb erst umhaengen, dann den Margin setzen: andersherum saesse der Margin fuer einen
/// Moment am alten Schirm.
#[cfg(target_os = "linux")]
#[tauri::command]
fn set_overlay_placement(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, OverlayState>,
    monitor_id: String,
    x: i32,
    y: i32,
) {
    if state.mode == overlay::OverlayMode::LayerShell {
        if !overlay::linux::set_monitor(&window, &monitor_id) {
            // Monitor waehrend des Ziehens verschwunden. Die Uhr bleibt, wo sie ist; den Margin
            // trotzdem zu setzen waere schlimmer, denn er zaehlte gegen den falschen Output.
            eprintln!("fliq: Monitor {monitor_id} nicht gefunden, Uhr bleibt am bisherigen Output");
            return;
        }
        overlay::linux::set_margin(&window, x, y);
    }

    let mut cfg = state.config.lock().unwrap();
    cfg.monitor = Some(monitor_id);
    cfg.margin_x = x;
    cfg.margin_y = y;
    if let Err(e) = cfg.save() {
        eprintln!("fliq: konnte linux.json nicht schreiben: {e}");
    }
}

/// Waehrend des Ziehens mit `persist: false` — sonst gaebe es einen Datei-Write pro
/// Mausbewegung. Beim Loslassen einmal mit `persist: true`.
#[tauri::command]
fn set_overlay_margin(
    _window: tauri::WebviewWindow,
    state: tauri::State<'_, OverlayState>,
    x: i32,
    y: i32,
    persist: bool,
) {
    {
        let mut cfg = state.config.lock().unwrap();
        cfg.margin_x = x;
        cfg.margin_y = y;
        if persist {
            if let Err(e) = cfg.save() {
                eprintln!("fliq: konnte linux.json nicht schreiben: {e}");
            }
        }
    }

    #[cfg(target_os = "linux")]
    if state.mode == overlay::OverlayMode::LayerShell {
        overlay::linux::set_margin(&_window, x, y);
    }
}

/// Wirkt erst nach einem Neustart — das GDK-Backend steht beim Start fest.
#[tauri::command]
fn set_overlay_mode(
    _app: tauri::AppHandle,
    state: tauri::State<'_, OverlayState>,
    mode: String,
) -> Result<(), String> {
    let pref = match mode.as_str() {
        "auto" => overlay::ModePreference::Auto,
        "layer-shell" => overlay::ModePreference::LayerShell,
        "x11" => overlay::ModePreference::X11,
        other => return Err(format!("unbekannter Overlay-Modus: {other}")),
    };
    let mut cfg = state.config.lock().unwrap();
    cfg.overlay_mode = pref;
    cfg.save().map_err(|e| e.to_string())?;

    // Auch wenn die Aenderung aus dem Styling-Fenster kommt, soll tuxhub sie sehen.
    #[cfg(target_os = "linux")]
    tuxhub::changed(&_app, serde_json::json!({ "overlayMode": pref.as_str() }));
    Ok(())
}

// Main Window
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(mode: overlay::OverlayMode, config: overlay::LinuxConfig) {
    // Muss vor dem Builder feststehen, siehe `ghost::LABELS`.
    #[cfg(target_os = "linux")]
    let ghost_labels: &[&str] = &overlay::ghost::LABELS;
    #[cfg(not(target_os = "linux"))]
    let ghost_labels: &[&str] = &[];

    tauri::Builder::default()
        // `skip_initial_state("main")`: der Default `StateFlags::all()` enthaelt `VISIBLE`, und das
        // Plugin restauriert den Zustand in `on_window_ready` — das laeuft synchron auf dem
        // Main-Thread, *bevor* diese `setup`-Closure drankommt (tauri::app::setup baut erst die
        // Fenster aus tauri.conf.json, dann den User-Setup-Hook). Das ruft `show()` + `set_focus()`
        // auf einem Fenster auf, das erst noch von `overlay::linux::apply` konfiguriert werden
        // muss, und restauriert nebenbei `SIZE`, obwohl das Frontend die Groesse ohnehin aus dem
        // Inhalt berechnet.
        //
        // Das Hauptfenster bekommt seinen Startzustand deshalb ausschliesslich unten im Setup:
        // Position restaurieren, dann `show()` — in dieser Reihenfolge und an genau einer Stelle.
        //
        // `with_denylist(ghost::LABELS)`: kein Ghost-Fenster darf das Plugin anfassen — und es
        // gibt jetzt eines je Monitor, die Liste muss also alle abdecken. Der Default
        // `StateFlags::all()` enthaelt `VISIBLE` — gespeichert und beim naechsten Start
        // restauriert waere das genau der Fehlerfall, gegen den diese Funktion konstruiert ist:
        // ein bildschirmfuellendes Overlay, sichtbar ohne laufenden Drag.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .skip_initial_state("main")
                .with_denylist(ghost_labels)
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--flag1", "--flag2"])))
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            use tauri::Manager;
            let window = app.get_webview_window("main");
            #[cfg(target_os = "linux")]
            let mut config = config;

            // Zielmonitor aufloesen, *bevor* `apply` die Margins setzt: ist der gespeicherte
            // Monitor weg (abgezogen, anderer Rechner, anderes Layout), zaehlen die
            // gespeicherten Margins gegen einen Output, den es nicht mehr gibt — die Uhr laege
            // moeglicherweise ausserhalb jedes Schirms. Dann lieber der erste vorhandene und
            // die Default-Margins; dieselbe Sorge, die `rescueMargin` fuer Koordinaten abdeckt.
            //
            // "Der erste vorhandene", nicht "der primaere": `gdk_monitor_is_primary()` liefert
            // unter Wayland fuer jeden Monitor 0, die Suche danach faende nie einen.
            #[cfg(target_os = "linux")]
            if mode == overlay::OverlayMode::LayerShell {
                let monitors = overlay::linux::monitors();
                let known = config
                    .monitor
                    .as_deref()
                    .is_some_and(|id| monitors.iter().any(|m| m.id == id));
                if !known {
                    if let Some(lost) = &config.monitor {
                        eprintln!("fliq: gespeicherter Monitor {lost} nicht vorhanden, setze Position zurueck");
                        let d = overlay::LinuxConfig::default();
                        config.margin_x = d.margin_x;
                        config.margin_y = d.margin_y;
                    }
                    config.monitor = monitors.first().map(|m| m.id.clone());
                    if let Err(e) = config.save() {
                        eprintln!("fliq: konnte linux.json nicht schreiben: {e}");
                    }
                }
            }

            // `mode` ist ab hier der *tatsaechlich* eingerichtete Modus, nicht der versuchte.
            // `apply` faellt bei Bedarf auf X11 zurueck, und was das Frontend gemeldet bekommt,
            // muss zum echten Fenster passen. Deshalb wird `OverlayState` erst hier registriert.
            #[cfg(target_os = "linux")]
            let mode = match &window {
                Some(w) => overlay::linux::apply(w, mode, config.margin_x, config.margin_y),
                None => mode,
            };

            // Nach `apply` (das `gtk_layer_init_for_window` erledigt) und vor `show()`, also
            // noch vor dem Realize.
            #[cfg(target_os = "linux")]
            if mode == overlay::OverlayMode::LayerShell {
                if let (Some(w), Some(id)) = (&window, &config.monitor) {
                    if !overlay::linux::set_monitor(w, id) {
                        eprintln!("fliq: Monitor {id} liess sich nicht zuweisen");
                    }
                }
            }

            if let Some(window) = window {
                // Ersetzt den uebersprungenen Initial-Restore des Plugins, aber nur `POSITION`:
                // ohne das erschiene das Fenster auf Windows erst an der Default-Position und
                // spraenge dann, sobald das Frontend `restoreStateCurrent(POSITION)` aufruft.
                // Fehler sind egal — auf Wayland gibt es keine Fensterposition, dort positioniert
                // der Compositor bzw. die Layer-Shell-Margin.
                use tauri_plugin_window_state::{StateFlags, WindowExt};
                let _ = window.restore_state(StateFlags::POSITION);

                // Bewusst ausserhalb des Linux-Blocks: `"visible": false` gilt fuer alle
                // Plattformen, also muss auch `show()` ueberall laufen.
                window.show()?;
            }

            app.manage(OverlayState { mode, config: std::sync::Mutex::new(config) });
            #[cfg(target_os = "linux")]
            app.manage(tuxhub::TuxhubState::default());

            // Nur im Layer-Shell-Modus: dort positioniert der Compositor, und ein Live-Drag
            // ueber Margins ist auf KWin unerreichbar. Der X11-Pfad zieht per `startDragging`
            // und braucht keinen Ghost.
            #[cfg(target_os = "linux")]
            if mode == overlay::OverlayMode::LayerShell {
                overlay::ghost::create(app.handle());
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_stylingmenu_window,
            get_overlay_state,
            set_overlay_margin,
            set_overlay_mode,
            #[cfg(target_os = "linux")]
            get_monitors,
            #[cfg(target_os = "linux")]
            set_overlay_placement,
            #[cfg(target_os = "linux")]
            overlay::ghost::ghost_show,
            #[cfg(target_os = "linux")]
            overlay::ghost::ghost_hide,
            #[cfg(target_os = "linux")]
            tuxhub::tuxhub_ready,
            #[cfg(target_os = "linux")]
            tuxhub::tuxhub_respond,
            #[cfg(target_os = "linux")]
            tuxhub::tuxhub_changed,
            #[cfg(target_os = "linux")]
            tuxhub::tuxhub_schema_changed
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, _event| {
            // Socket wegraeumen, egal ob ueber "Exit", das letzte Fenster oder tuxhub beendet.
            #[cfg(target_os = "linux")]
            if let tauri::RunEvent::Exit = _event {
                tuxhub::stop(_app);
            }
        });
}
