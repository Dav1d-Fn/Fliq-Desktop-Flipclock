// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn open_colorpicker_window(app: tauri::AppHandle) {
        
let file_path: &str = "colorPicker.html";
        
let _colorpicker_window = tauri::WindowBuilder::new(
    &app,
    "Colorpicker", /* the unique window label */
    tauri::WindowUrl::App(file_path.into()),
    )
    .inner_size(275.0, 310.0)
    .title("Colorpicker")
    .build()
    .unwrap();
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_context_menu::init())
        .invoke_handler(tauri::generate_handler![greet])
        .invoke_handler(tauri::generate_handler![open_colorpicker_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
