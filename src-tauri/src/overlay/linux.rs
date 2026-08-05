//! Linux-spezifischer Teil des Overlays: Compositor-Probe und Fensterkonfiguration.

use wayland_client::{
    globals::{registry_queue_init, GlobalListContents},
    protocol::wl_registry,
    Connection, Dispatch, QueueHandle,
};

/// Der Probe braucht keinen Zustand — er liest nur die Global-Liste, die
/// `registry_queue_init` bereits gesammelt hat.
struct Probe;

impl Dispatch<wl_registry::WlRegistry, GlobalListContents> for Probe {
    fn event(
        _: &mut Self,
        _: &wl_registry::WlRegistry,
        _: wl_registry::Event,
        _: &GlobalListContents,
        _: &Connection,
        _: &QueueHandle<Self>,
    ) {
    }
}

/// Fragt den laufenden Compositor, ob er `zwlr_layer_shell_v1` anbietet.
///
/// Laeuft bewusst **vor** jeder GTK-Initialisierung, damit die Wahl des GDK-Backends
/// noch offen ist. Jeder Fehler bedeutet "nicht verfuegbar" — im Zweifel der Modus,
/// der ueberall laeuft.
pub fn layer_shell_available() -> bool {
    let Ok(conn) = Connection::connect_to_env() else {
        return false;
    };
    let Ok((globals, _queue)) = registry_queue_init::<Probe>(&conn) else {
        return false;
    };
    globals
        .contents()
        .with_list(|list| list.iter().any(|g| g.interface == "zwlr_layer_shell_v1"))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Diagnostischer Test, kein Teil der normalen Suite: verbindet sich mit dem echten
    /// Compositor. Auf dem Entwicklungssystem (KDE Plasma, Wayland) muss dies `true` melden,
    /// da `wayland-info` `zwlr_layer_shell_v1` bestaetigt.
    ///
    /// Ausfuehren mit: `cargo test -- --ignored --nocapture`
    #[test]
    #[ignore]
    fn probe_reports_layer_shell_on_this_machine() {
        println!("layer_shell_available() = {}", layer_shell_available());
    }
}
