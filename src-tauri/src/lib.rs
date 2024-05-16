#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn open_colorpicker_window(app: tauri::AppHandle) {
    let file_path: &str = "colorPicker.html";

    let _colorpicker_window = tauri::WebviewWindowBuilder::new(
        &app,
        "Colorpicker", /* the unique window label */
        tauri::WebviewUrl::App(file_path.into()),
    )
    .inner_size(275.0, 310.0)
    .title("Colorpicker")
    .build()
    .unwrap();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--flag1", "--flag2"])))
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet])
        .invoke_handler(tauri::generate_handler![open_colorpicker_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
