//! Commands the frontend calls with `invoke`. Platform-specific details live in `overlay`.

use crate::overlay;
#[cfg(target_os = "linux")]
use crate::tuxhub;

/// Chosen overlay mode and the persisted values, reachable from the commands.
pub struct OverlayState {
    pub mode: overlay::OverlayMode,
    pub config: std::sync::Mutex<overlay::LinuxConfig>,
}

#[derive(serde::Serialize)]
pub struct OverlayInfo {
    pub mode: String,
    pub margin_x: i32,
    pub margin_y: i32,
    /// The stored preference from `linux.json` ("auto"/"layer-shell"/"x11"), not the mode in
    /// effect. Lets the styling window preselect the dropdown correctly after a restart.
    pub preference: String,
    /// The output the clock is on (`get_monitors().id`). `None` means no layer-shell or no
    /// monitor known yet; the frontend then works against the screen it knows.
    pub monitor: Option<String>,
}

#[tauri::command]
pub async fn open_stylingmenu_window(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;

    if let Some(existing) = app.get_webview_window("Styling") {
        let _ = existing.set_focus();
        return Ok(());
    }

    tauri::WebviewWindowBuilder::new(&app, "Styling", tauri::WebviewUrl::App("stylingMenu.html".into()))
        .inner_size(1614.0, 1018.0)
        .min_inner_size(1000.0, 640.0)
        .resizable(true)
        .title("Fliq Settings")
        .build()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Ends the process. Closing every window from the frontend was not reliable: a window that
/// refused or missed the close kept the app running invisibly.
#[tauri::command]
pub fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub fn get_overlay_state(state: tauri::State<'_, OverlayState>) -> OverlayInfo {
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

/// Global geometry of all outputs, so the frontend can convert between global and output-local
/// coordinates while dragging. Order and index match the ghost windows (`ghost::LABELS`).
///
/// Deliberately **synchronous**: GDK is main-thread-only, and only synchronous commands run there.
#[cfg(target_os = "linux")]
#[tauri::command]
pub fn get_monitors() -> Vec<overlay::linux::MonitorInfo> {
    overlay::linux::monitors()
}

/// Limits the click area to the clock, see `overlay::linux::set_input_region`.
/// Synchronous, because GTK is main-thread-only.
#[cfg(target_os = "linux")]
#[tauri::command]
pub fn set_input_region(window: tauri::WebviewWindow, x: i32, y: i32, w: i32, h: i32) {
    overlay::linux::set_input_region(&window, x, y, w, h);
}

/// On release: move to another output (if needed) and store the position.
///
/// `x`/`y` are **output-local**: the clock's place in the full-output surface, set by CSS in the
/// frontend. Stored under the old names `margin_x/y`, so existing `linux.json` files keep their
/// position.
#[cfg(target_os = "linux")]
#[tauri::command]
pub fn set_overlay_placement(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, OverlayState>,
    monitor_id: String,
    x: i32,
    y: i32,
) {
    if state.mode == overlay::OverlayMode::LayerShell && !overlay::linux::set_monitor(&window, &monitor_id) {
        // Monitor vanished during the drag. The clock stays where it is; setting the margin anyway
        // would be worse, since it would count against the wrong output.
        eprintln!("fliq: monitor {monitor_id} not found, the clock stays on its output");
        return;
    }

    let mut cfg = state.config.lock().unwrap();
    cfg.monitor = Some(monitor_id);
    cfg.margin_x = x;
    cfg.margin_y = y;
    if let Err(e) = cfg.save() {
        eprintln!("fliq: could not write linux.json: {e}");
    }
}

/// Position on the non-layer-shell path. `persist: false` would only update memory; the
/// frontend sends `true` once on release, never per pointer move.
#[tauri::command]
pub fn set_overlay_margin(state: tauri::State<'_, OverlayState>, x: i32, y: i32, persist: bool) {
    let mut cfg = state.config.lock().unwrap();
    cfg.margin_x = x;
    cfg.margin_y = y;
    if persist {
        if let Err(e) = cfg.save() {
            eprintln!("fliq: could not write linux.json: {e}");
        }
    }
}

/// Takes effect after a restart only: the GDK backend is fixed at startup.
#[tauri::command]
pub fn set_overlay_mode(
    _app: tauri::AppHandle,
    state: tauri::State<'_, OverlayState>,
    mode: String,
) -> Result<(), String> {
    let pref = match mode.as_str() {
        "auto" => overlay::ModePreference::Auto,
        "layer-shell" => overlay::ModePreference::LayerShell,
        "x11" => overlay::ModePreference::X11,
        other => return Err(format!("unknown overlay mode: {other}")),
    };
    let mut cfg = state.config.lock().unwrap();
    cfg.overlay_mode = pref;
    cfg.save().map_err(|e| e.to_string())?;

    // tuxhub should see the change even when it comes from the styling window.
    #[cfg(target_os = "linux")]
    tuxhub::changed(&_app, serde_json::json!({ "overlayMode": pref.as_str() }));
    Ok(())
}
