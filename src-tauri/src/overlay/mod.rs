use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::time::Duration;

#[cfg(target_os = "linux")]
pub mod ghost;
#[cfg(target_os = "linux")]
pub mod linux;

/// What the user chose. `Auto` means: detect.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum ModePreference {
    #[default]
    Auto,
    LayerShell,
    X11,
}

impl ModePreference {
    /// String at the frontend boundary, the same values `set_overlay_mode` expects.
    pub fn as_str(self) -> &'static str {
        match self {
            ModePreference::Auto => "auto",
            ModePreference::LayerShell => "layer-shell",
            ModePreference::X11 => "x11",
        }
    }
}

/// What is settled after detection. No `Auto` any more.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OverlayMode {
    LayerShell,
    X11,
}

impl OverlayMode {
    /// String at the frontend boundary.
    pub fn as_str(self) -> &'static str {
        match self {
            OverlayMode::LayerShell => "layer-shell",
            OverlayMode::X11 => "x11",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LinuxConfig {
    pub overlay_mode: ModePreference,
    pub margin_x: i32,
    pub margin_y: i32,
    /// The output the clock is on (`linux::MonitorInfo::id`). `None` means: never set, so the
    /// start takes the first one available.
    ///
    /// `#[serde(default)]` is not cosmetic: `linux.json` files from older builds lack the key.
    /// Without the attribute deserialisation would fail and `load_from` would fall back to the
    /// defaults, losing the stored position on the first start after the update.
    #[serde(default)]
    pub monitor: Option<String>,
}

impl Default for LinuxConfig {
    fn default() -> Self {
        Self { overlay_mode: ModePreference::Auto, margin_x: 40, margin_y: 40, monitor: None }
    }
}

/// Pure path logic, no env access — testable without touching process-global state.
/// `xdg` must be absolute to count; a relative `XDG_CONFIG_HOME` is ignored per spec,
/// falling through to `$HOME/.config`.
fn resolve_default_path(xdg: Option<PathBuf>, home: Option<PathBuf>) -> Option<PathBuf> {
    let base = xdg
        .filter(|p| p.is_absolute())
        .or_else(|| home.map(|h| h.join(".config")))?;
    Some(base.join("com.flipclock.dev").join("linux.json"))
}

impl LinuxConfig {
    pub fn default_path() -> Option<PathBuf> {
        resolve_default_path(
            std::env::var_os("XDG_CONFIG_HOME").map(PathBuf::from),
            std::env::var_os("HOME").map(PathBuf::from),
        )
    }

    /// Reads the configuration. A missing or broken file means defaults; a panic here would
    /// mean the widget no longer starts.
    pub fn load_from(path: &Path) -> Self {
        std::fs::read_to_string(path)
            .ok()
            .and_then(|raw| serde_json::from_str(&raw).ok())
            .unwrap_or_default()
    }

    pub fn save_to(&self, path: &Path) -> std::io::Result<()> {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir)?;
        }
        std::fs::write(path, serde_json::to_string_pretty(self)?)
    }

    pub fn load() -> Self {
        Self::default_path().map(|p| Self::load_from(&p)).unwrap_or_default()
    }

    pub fn save(&self) -> std::io::Result<()> {
        match Self::default_path() {
            Some(p) => self.save_to(&p),
            None => Ok(()),
        }
    }
}

/// Runs `body` on its own thread and waits at most `timeout` for a result. Both a timeout and a
/// disconnected channel (the thread panicked) count as `false`. Pure concurrency logic with
/// nothing platform-specific, so it lives in `mod.rs` instead of the Linux-gated module and is
/// compiled and tested on every platform.
///
/// The worker thread is deliberately never joined. If `body` hangs forever (a dead socket that
/// never answers), the thread leaks for the life of the process. That is fine: it holds no lock
/// and nobody waits for it. Do not "fix" this with a `join`, that would bring back the hang
/// this wrapper avoids.
// Only `linux.rs` and the tests call this; on Windows/macOS it would warn as dead code.
#[cfg_attr(not(target_os = "linux"), allow(dead_code))]
fn with_timeout<F>(timeout: Duration, body: F) -> bool
where
    F: FnOnce() -> bool + Send + 'static,
{
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let _ = tx.send(body());
    });
    rx.recv_timeout(timeout).unwrap_or(false)
}

/// Pure decision logic, so it can be tested without a compositor.
///
/// `session_type` is the value of `XDG_SESSION_TYPE`.
/// `layer_shell_available` says whether the Wayland registry offers `zwlr_layer_shell_v1`.
pub fn detect_mode(
    pref: ModePreference,
    session_type: Option<&str>,
    layer_shell_available: bool,
) -> OverlayMode {
    let on_wayland = session_type == Some("wayland");

    match pref {
        // No layer-shell without a Wayland session. The preference must not lead to an
        // invisible clock, so X11 is forced.
        ModePreference::LayerShell if on_wayland => OverlayMode::LayerShell,
        ModePreference::LayerShell => OverlayMode::X11,
        ModePreference::X11 => OverlayMode::X11,
        ModePreference::Auto if on_wayland && layer_shell_available => OverlayMode::LayerShell,
        ModePreference::Auto => OverlayMode::X11,
    }
}

/// IO shell around [`detect_mode`]. Always X11 off Linux, where the value is not used anyway.
pub fn detect_mode_from_env(pref: ModePreference) -> OverlayMode {
    let session_type = std::env::var("XDG_SESSION_TYPE").ok();

    #[cfg(target_os = "linux")]
    let available = session_type.as_deref() == Some("wayland") && linux::layer_shell_available();
    #[cfg(not(target_os = "linux"))]
    let available = false;

    detect_mode(pref, session_type.as_deref(), available)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_path(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("fliq-test-{name}"));
        let _ = std::fs::remove_dir_all(&dir);
        dir.join("linux.json")
    }

    #[test]
    fn defaults_are_auto_and_forty() {
        let cfg = LinuxConfig::default();
        assert_eq!(cfg.overlay_mode, ModePreference::Auto);
        assert_eq!(cfg.margin_x, 40);
        assert_eq!(cfg.margin_y, 40);
        assert_eq!(cfg.monitor, None);
    }

    #[test]
    fn save_then_load_round_trips() {
        let path = temp_path("roundtrip");
        let cfg = LinuxConfig {
            overlay_mode: ModePreference::LayerShell,
            margin_x: 12,
            margin_y: 99,
            monitor: Some("Dell Inc. AW3423DWF".into()),
        };
        cfg.save_to(&path).expect("save must create parent dirs and write");
        assert_eq!(LinuxConfig::load_from(&path), cfg);
    }

    /// A `linux.json` from a build before the monitor field exists on real machines. It must not
    /// count as broken, or the stored position would be lost on the first start after the
    /// update and the clock would jump back to 40/40.
    #[test]
    fn config_without_monitor_key_keeps_its_margins() {
        let path = temp_path("old-shape");
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(&path, r#"{"overlay_mode":"layer-shell","margin_x":123,"margin_y":456}"#)
            .unwrap();
        let cfg = LinuxConfig::load_from(&path);
        assert_eq!(cfg.overlay_mode, ModePreference::LayerShell);
        assert_eq!(cfg.margin_x, 123);
        assert_eq!(cfg.margin_y, 456);
        assert_eq!(cfg.monitor, None);
    }

    #[test]
    fn missing_file_falls_back_to_defaults() {
        let path = temp_path("missing");
        assert_eq!(LinuxConfig::load_from(&path), LinuxConfig::default());
    }

    #[test]
    fn corrupt_file_falls_back_to_defaults_without_panicking() {
        let path = temp_path("corrupt");
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(&path, "{ this is not json").unwrap();
        assert_eq!(LinuxConfig::load_from(&path), LinuxConfig::default());
    }

    #[test]
    fn mode_preference_serializes_kebab_case() {
        let json = serde_json::to_string(&ModePreference::LayerShell).unwrap();
        assert_eq!(json, "\"layer-shell\"");
    }

    #[test]
    fn overlay_mode_as_str_matches_frontend_contract() {
        assert_eq!(OverlayMode::LayerShell.as_str(), "layer-shell");
        assert_eq!(OverlayMode::X11.as_str(), "x11");
    }

    #[test]
    fn resolve_default_path_uses_absolute_xdg() {
        // `env::temp_dir()` is guaranteed absolute on every target; a hardcoded "/xdg" is not
        // absolute on Windows (no drive letter), which is what made this test Unix-only.
        let xdg = std::env::temp_dir().join("xdg");
        let home = std::env::temp_dir().join("home_u");
        let got = resolve_default_path(Some(xdg.clone()), Some(home));
        assert_eq!(got, Some(xdg.join("com.flipclock.dev").join("linux.json")));
    }

    #[test]
    fn resolve_default_path_ignores_relative_xdg_falls_back_to_home() {
        let xdg = PathBuf::from("relative").join("xdg"); // relative on every platform
        let home = std::env::temp_dir().join("home_u");
        let got = resolve_default_path(Some(xdg), Some(home.clone()));
        assert_eq!(
            got,
            Some(home.join(".config").join("com.flipclock.dev").join("linux.json"))
        );
    }

    #[test]
    fn resolve_default_path_uses_home_when_xdg_absent() {
        let home = std::env::temp_dir().join("home_u");
        let got = resolve_default_path(None, Some(home.clone()));
        assert_eq!(
            got,
            Some(home.join(".config").join("com.flipclock.dev").join("linux.json"))
        );
    }

    #[test]
    fn resolve_default_path_none_when_both_absent() {
        assert_eq!(resolve_default_path(None, None), None);
    }

    #[test]
    fn explicit_x11_preference_wins_everywhere() {
        assert_eq!(detect_mode(ModePreference::X11, Some("wayland"), true), OverlayMode::X11);
        assert_eq!(detect_mode(ModePreference::X11, Some("x11"), false), OverlayMode::X11);
    }

    #[test]
    fn explicit_layer_shell_preference_is_honoured_on_wayland() {
        assert_eq!(detect_mode(ModePreference::LayerShell, Some("wayland"), true), OverlayMode::LayerShell);
    }

    #[test]
    fn explicit_layer_shell_preference_falls_back_on_x11_session() {
        // Layer-shell in an X11 session is impossible; the preference must not lead to an
        // invisible clock.
        assert_eq!(detect_mode(ModePreference::LayerShell, Some("x11"), false), OverlayMode::X11);
    }

    #[test]
    fn auto_picks_layer_shell_when_wayland_and_protocol_present() {
        assert_eq!(detect_mode(ModePreference::Auto, Some("wayland"), true), OverlayMode::LayerShell);
    }

    #[test]
    fn auto_picks_x11_when_wayland_but_protocol_missing() {
        // GNOME: Wayland session, but no zwlr_layer_shell_v1.
        assert_eq!(detect_mode(ModePreference::Auto, Some("wayland"), false), OverlayMode::X11);
    }

    #[test]
    fn auto_picks_x11_on_x11_session() {
        assert_eq!(detect_mode(ModePreference::Auto, Some("x11"), false), OverlayMode::X11);
    }

    #[test]
    fn auto_picks_x11_when_session_type_is_unknown() {
        assert_eq!(detect_mode(ModePreference::Auto, None, false), OverlayMode::X11);
        assert_eq!(detect_mode(ModePreference::Auto, Some("tty"), true), OverlayMode::X11);
    }

    /// Pure timeout logic, no compositor needed: a hanging `body` must not hold up the caller.
    #[test]
    fn with_timeout_returns_false_when_body_hangs_past_deadline() {
        let got = with_timeout(Duration::from_millis(20), || {
            std::thread::sleep(Duration::from_secs(5));
            true
        });
        assert_eq!(got, false);
    }

    /// The normal case: a `body` that answers in time comes through unchanged.
    #[test]
    fn with_timeout_returns_prompt_result() {
        let got = with_timeout(Duration::from_millis(500), || true);
        assert_eq!(got, true);
    }
}
