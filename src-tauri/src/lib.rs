#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Window definition for the styling menu
#[tauri::command]
async fn open_stylingmenu_window(app: tauri::AppHandle) {
    let file_path: &str = "stylingMenu.html";

    let _stylingmenu_window = tauri::WebviewWindowBuilder::new(
        &app,
        "Styling", /* the unique window label */
        tauri::WebviewUrl::App(file_path.into()),
    )
    .inner_size(610.0, 460.0)
    .resizable(false)
    .title("Styling")
    .build()
    .unwrap();
}
 
// Main Window
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--flag1", "--flag2"])))
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet])
        .invoke_handler(tauri::generate_handler![open_stylingmenu_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
