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

// Main Window
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(mode: overlay::OverlayMode, config: overlay::LinuxConfig) {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--flag1", "--flag2"])))
        .plugin(tauri_plugin_shell::init())
        .manage(OverlayState { mode, config: std::sync::Mutex::new(config.clone()) })
        .setup(move |app| {
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "linux")]
                overlay::linux::apply(&window, mode, config.margin_x, config.margin_y);

                // Bewusst ausserhalb des Linux-Blocks: `"visible": false` gilt fuer alle
                // Plattformen, also muss auch `show()` ueberall laufen.
                window.show()?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![open_stylingmenu_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
