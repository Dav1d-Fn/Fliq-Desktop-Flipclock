// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use desktop_flipclock_lib::overlay;

fn main() {
    let config = overlay::LinuxConfig::load();
    let mode = overlay::detect_mode_from_env(config.overlay_mode);

    // MUST happen before any GTK initialisation; Tauri initialises GTK only in `run`.
    // Edition 2021: `set_var` is still safe to call here (single thread, nothing started yet).
    #[cfg(target_os = "linux")]
    if mode == overlay::OverlayMode::X11 {
        std::env::set_var("GDK_BACKEND", "x11");
    }

    desktop_flipclock_lib::run(mode, config);
}
