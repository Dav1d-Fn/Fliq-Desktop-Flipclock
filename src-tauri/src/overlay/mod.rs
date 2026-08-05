use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::time::Duration;

#[cfg(target_os = "linux")]
pub mod linux;

/// Was der Nutzer eingestellt hat. `Auto` heißt: erkennen.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum ModePreference {
    #[default]
    Auto,
    LayerShell,
    X11,
}

impl ModePreference {
    /// String an der Frontend-Grenze, gleiche Werte wie `set_overlay_mode` erwartet.
    pub fn as_str(self) -> &'static str {
        match self {
            ModePreference::Auto => "auto",
            ModePreference::LayerShell => "layer-shell",
            ModePreference::X11 => "x11",
        }
    }
}

/// Was nach der Erkennung feststeht. Kein `Auto` mehr möglich.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OverlayMode {
    LayerShell,
    X11,
}

impl OverlayMode {
    /// String an der Frontend-Grenze.
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
}

impl Default for LinuxConfig {
    fn default() -> Self {
        Self { overlay_mode: ModePreference::Auto, margin_x: 40, margin_y: 40 }
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

    /// Liest die Konfiguration. Fehlt die Datei oder ist sie kaputt, gelten die Defaults —
    /// ein Panic hier hiesse: Widget startet nicht mehr.
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

/// Fuehrt `body` auf einem eigenen Thread aus und wartet hoechstens `timeout` auf ein
/// Ergebnis. Sowohl ein Timeout als auch ein getrennter Channel (Thread ist gepanict) zaehlen
/// als `false`. Reine Nebenlaeufigkeits-Logik — nichts hier ist plattformspezifisch, deshalb
/// lebt sie hier in `mod.rs` statt im `#[cfg(target_os = "linux")]`-gated `linux`-Modul, damit
/// sie auf jeder Plattform kompiliert und getestet wird.
///
/// Der Worker-Thread wird absichtlich nie gejoint. Haengt `body` fuer immer (z. B. ein totes
/// Socket, das nie antwortet), leakt der Thread fuer die Lebensdauer des Prozesses — das ist
/// hier in Ordnung: er haelt kein Lock und der Aufrufer wartet nicht auf ihn. Bitte nicht
/// "reparieren", indem ein `join` ergaenzt wird — das wuerde den Hang zurueckholen, den dieser
/// Wrapper gerade vermeidet.
// Nur `linux.rs` und die Tests rufen das auf — auf Windows/macOS sonst eine dead_code-Warnung.
// Bleibt bewusst hier im ungegateten Modul, damit die Tests auf jeder Plattform laufen.
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

/// Reine Entscheidungslogik, damit sie ohne Compositor testbar ist.
///
/// `session_type` ist der Wert von `XDG_SESSION_TYPE`.
/// `layer_shell_available` sagt, ob die Wayland-Registry `zwlr_layer_shell_v1` anbietet.
pub fn detect_mode(
    pref: ModePreference,
    session_type: Option<&str>,
    layer_shell_available: bool,
) -> OverlayMode {
    let on_wayland = session_type == Some("wayland");

    match pref {
        // Ohne Wayland-Session gibt es keine Layer-Shell — die Praeferenz darf nicht in
        // einen unsichtbaren Zustand fuehren, also X11 erzwingen.
        ModePreference::LayerShell if on_wayland => OverlayMode::LayerShell,
        ModePreference::LayerShell => OverlayMode::X11,
        ModePreference::X11 => OverlayMode::X11,
        ModePreference::Auto if on_wayland && layer_shell_available => OverlayMode::LayerShell,
        ModePreference::Auto => OverlayMode::X11,
    }
}

/// IO-Huelle um [`detect_mode`]. Auf Nicht-Linux immer X11 — dort wird der Wert ohnehin
/// nicht benutzt.
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
    }

    #[test]
    fn save_then_load_round_trips() {
        let path = temp_path("roundtrip");
        let cfg = LinuxConfig { overlay_mode: ModePreference::LayerShell, margin_x: 12, margin_y: 99 };
        cfg.save_to(&path).expect("save must create parent dirs and write");
        assert_eq!(LinuxConfig::load_from(&path), cfg);
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
        let got = resolve_default_path(Some(PathBuf::from("/xdg")), Some(PathBuf::from("/home/u")));
        assert_eq!(got, Some(PathBuf::from("/xdg/com.flipclock.dev/linux.json")));
    }

    #[test]
    fn resolve_default_path_ignores_relative_xdg_falls_back_to_home() {
        let got = resolve_default_path(Some(PathBuf::from("relative/xdg")), Some(PathBuf::from("/home/u")));
        assert_eq!(got, Some(PathBuf::from("/home/u/.config/com.flipclock.dev/linux.json")));
    }

    #[test]
    fn resolve_default_path_uses_home_when_xdg_absent() {
        let got = resolve_default_path(None, Some(PathBuf::from("/home/u")));
        assert_eq!(got, Some(PathBuf::from("/home/u/.config/com.flipclock.dev/linux.json")));
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
        // Layer-Shell in einer X11-Session ist unmoeglich; die Praeferenz darf nicht in einen
        // unsichtbaren Zustand fuehren.
        assert_eq!(detect_mode(ModePreference::LayerShell, Some("x11"), false), OverlayMode::X11);
    }

    #[test]
    fn auto_picks_layer_shell_when_wayland_and_protocol_present() {
        assert_eq!(detect_mode(ModePreference::Auto, Some("wayland"), true), OverlayMode::LayerShell);
    }

    #[test]
    fn auto_picks_x11_when_wayland_but_protocol_missing() {
        // GNOME: Wayland-Session, aber kein zwlr_layer_shell_v1.
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

    /// Reine Timeout-Logik, kein Compositor noetig: eine haengende `body` darf den Aufrufer
    /// nicht mit aufhalten.
    #[test]
    fn with_timeout_returns_false_when_body_hangs_past_deadline() {
        let got = with_timeout(Duration::from_millis(20), || {
            std::thread::sleep(Duration::from_secs(5));
            true
        });
        assert_eq!(got, false);
    }

    /// Der Normalfall: eine `body`, die rechtzeitig antwortet, kommt unveraendert durch.
    #[test]
    fn with_timeout_returns_prompt_result() {
        let got = with_timeout(Duration::from_millis(500), || true);
        assert_eq!(got, true);
    }
}
