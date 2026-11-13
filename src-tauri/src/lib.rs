pub mod commands;
pub mod overlay;
#[cfg(target_os = "linux")]
pub mod tuxhub;

use commands::OverlayState;

/// Builds and runs the app. `mode` and `config` come from `main`, which has to decide the GDK
/// backend before GTK starts.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(mode: overlay::OverlayMode, config: overlay::LinuxConfig) {
    // Has to be known before the builder, see `ghost::LABELS`.
    #[cfg(target_os = "linux")]
    let ghost_labels: &[&str] = &overlay::ghost::LABELS;
    #[cfg(not(target_os = "linux"))]
    let ghost_labels: &[&str] = &[];

    tauri::Builder::default()
        // `skip_initial_state("main")`: the default `StateFlags::all()` contains `VISIBLE`, and the
        // plugin restores state in `on_window_ready`, which runs synchronously on the main thread
        // *before* the `setup` closure below (tauri builds the windows from tauri.conf.json first,
        // then calls the user setup hook). That would call `show()` + `set_focus()` on a window
        // that `overlay::linux::apply` still has to configure, and restore `SIZE`, although the
        // frontend sizes the window from its content anyway.
        //
        // The main window therefore gets its start state only in `setup`: restore the position,
        // then `show()`, in that order and in exactly one place.
        //
        // `with_denylist(ghost::LABELS)`: the plugin must not touch any ghost window. Restoring a
        // saved `VISIBLE` would be exactly the failure the ghosts are built against: a full-screen
        // overlay, visible without a drag.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .skip_initial_state("main")
                .with_denylist(ghost_labels)
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            use tauri::Manager;
            let window = app.get_webview_window("main");
            #[cfg(target_os = "linux")]
            let mut config = config;

            #[cfg(target_os = "linux")]
            if mode == overlay::OverlayMode::LayerShell {
                restore_saved_monitor(&mut config);
            }

            // From here on `mode` is the mode *actually* set up, not the one attempted. `apply`
            // falls back to X11 if needed, and what the frontend is told has to match the real
            // window. That is why `OverlayState` is registered only below.
            #[cfg(target_os = "linux")]
            let mode = match &window {
                Some(w) => overlay::linux::apply(w, mode),
                None => mode,
            };

            // After `apply` (which runs `gtk_layer_init_for_window`) and before `show()`, so still
            // before the realize.
            #[cfg(target_os = "linux")]
            if mode == overlay::OverlayMode::LayerShell {
                if let (Some(w), Some(id)) = (&window, &config.monitor) {
                    if !overlay::linux::set_monitor(w, id) {
                        eprintln!("fliq: could not assign monitor {id}");
                    }
                }
            }

            if let Some(window) = window {
                #[cfg(target_os = "linux")]
                overlay::linux::reload_on_crash(&window);
                #[cfg(target_os = "linux")]
                overlay::linux::report_pointer_leave(&window);

                // Replaces the plugin's skipped initial restore, but only `POSITION`: without it
                // the window would first appear at the default position on Windows and jump as
                // soon as the frontend calls `restoreStateCurrent(POSITION)`. Errors do not
                // matter; Wayland has no window position.
                use tauri_plugin_window_state::{StateFlags, WindowExt};
                let _ = window.restore_state(StateFlags::POSITION);

                // Outside the Linux block on purpose: `"visible": false` applies to every
                // platform, so `show()` has to run everywhere.
                window.show()?;
            }

            app.manage(OverlayState { mode, config: std::sync::Mutex::new(config) });
            #[cfg(target_os = "linux")]
            app.manage(tuxhub::TuxhubState::default());

            // The ghost windows (layer-shell only) are created on the first drag, see
            // `overlay::ghost::ghost_show`.
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_stylingmenu_window,
            commands::quit_app,
            commands::get_overlay_state,
            commands::set_overlay_margin,
            commands::set_overlay_mode,
            #[cfg(target_os = "linux")]
            commands::get_monitors,
            #[cfg(target_os = "linux")]
            commands::set_overlay_placement,
            #[cfg(target_os = "linux")]
            commands::set_input_region,
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
            // Remove the socket however the app ends: "Exit", the last window, or tuxhub.
            #[cfg(target_os = "linux")]
            if let tauri::RunEvent::Exit = _event {
                tuxhub::stop(_app);
            }
        });
}

/// Resolves the stored target monitor *before* `apply` sets up the surface. If it is gone
/// (unplugged, other machine, other layout), the stored position counts against an output that
/// no longer exists and the clock might sit outside every screen. Then the first available
/// monitor and the default position are used instead.
///
/// "The first available", not "the primary": `gdk_monitor_is_primary()` returns 0 for every
/// monitor under Wayland, a search for it would never find one.
#[cfg(target_os = "linux")]
fn restore_saved_monitor(config: &mut overlay::LinuxConfig) {
    let monitors = overlay::linux::monitors();
    let known = config
        .monitor
        .as_deref()
        .is_some_and(|id| monitors.iter().any(|m| m.id == id));
    if known {
        return;
    }

    if let Some(lost) = &config.monitor {
        eprintln!("fliq: stored monitor {lost} not present, resetting the position");
        let defaults = overlay::LinuxConfig::default();
        config.margin_x = defaults.margin_x;
        config.margin_y = defaults.margin_y;
    }
    config.monitor = monitors.first().map(|m| m.id.clone());
    if let Err(e) = config.save() {
        eprintln!("fliq: could not write linux.json: {e}");
    }
}
