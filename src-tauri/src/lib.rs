#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

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
 
// Main Window
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--flag1", "--flag2"])))
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(target_os = "linux")]
            {
                use tauri::Manager;
                use gtk::prelude::GtkWindowExt;
                if let Some(window) = app.get_webview_window("main") {
                    if let Ok(gtk_win) = window.gtk_window() {
                        gtk_win.set_type_hint(gtk::gdk::WindowTypeHint::Utility);
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![open_stylingmenu_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
