use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

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
}
