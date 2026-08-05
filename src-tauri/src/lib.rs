pub mod overlay;

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
fn set_overlay_mode(state: tauri::State<'_, OverlayState>, mode: String) -> Result<(), String> {
    let pref = match mode.as_str() {
        "auto" => overlay::ModePreference::Auto,
        "layer-shell" => overlay::ModePreference::LayerShell,
        "x11" => overlay::ModePreference::X11,
        other => return Err(format!("unbekannter Overlay-Modus: {other}")),
    };
    let mut cfg = state.config.lock().unwrap();
    cfg.overlay_mode = pref;
    cfg.save().map_err(|e| e.to_string())
}

// Main Window
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(mode: overlay::OverlayMode, config: overlay::LinuxConfig) {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--flag1", "--flag2"])))
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            use tauri::Manager;
            let window = app.get_webview_window("main");

            // `mode` ist ab hier der *tatsaechlich* eingerichtete Modus, nicht der versuchte.
            // `apply` faellt bei Bedarf auf X11 zurueck, und was das Frontend gemeldet bekommt,
            // muss zum echten Fenster passen. Deshalb wird `OverlayState` erst hier registriert.
            #[cfg(target_os = "linux")]
            let mode = match &window {
                Some(w) => overlay::linux::apply(w, mode, config.margin_x, config.margin_y),
                None => mode,
            };

            if let Some(window) = window {
                // Bewusst ausserhalb des Linux-Blocks: `"visible": false` gilt fuer alle
                // Plattformen, also muss auch `show()` ueberall laufen.
                window.show()?;
            }

            app.manage(OverlayState { mode, config: std::sync::Mutex::new(config) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_stylingmenu_window,
            get_overlay_state,
            set_overlay_margin,
            set_overlay_mode
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
