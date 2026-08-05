//! Linux-spezifischer Teil des Overlays: Compositor-Probe und Fensterkonfiguration.

use std::sync::mpsc;
use std::time::Duration;
use wayland_client::{
    globals::{registry_queue_init, GlobalListContents},
    protocol::wl_registry,
    Connection, Dispatch, QueueHandle,
};

const PROBE_TIMEOUT: Duration = Duration::from_millis(500);

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

/// Fuehrt `body` auf einem eigenen Thread aus und wartet hoechstens `timeout` auf ein
/// Ergebnis. Sowohl ein Timeout als auch ein getrennter Channel (Thread ist gepanict) zaehlen
/// als `false` — dieselbe "im Zweifel nicht verfuegbar"-Regel wie beim Rest des Probes.
///
/// Der Worker-Thread wird absichtlich nie gejoint. Haengt `body` fuer immer (z. B. ein totes
/// Socket, das nie antwortet), leakt der Thread fuer die Lebensdauer des Prozesses — das ist
/// hier in Ordnung: er haelt kein Lock und die App wartet nicht auf ihn, um zu starten. Bitte
/// nicht "reparieren", indem ein `join` ergaenzt wird — das wuerde den Hang zurueckholen, den
/// dieser Wrapper gerade vermeidet.
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

/// Fragt den laufenden Compositor, ob er `zwlr_layer_shell_v1` anbietet.
///
/// Laeuft bewusst **vor** jeder GTK-Initialisierung, damit die Wahl des GDK-Backends
/// noch offen ist. Jeder Fehler bedeutet "nicht verfuegbar" — im Zweifel der Modus,
/// der ueberall laeuft. Das schliesst einen haengenden Compositor/ein totes Socket ein: der
/// eigentliche Roundtrip laeuft in `with_timeout`, damit ein fehlendes Ende der Verbindung
/// den App-Start nicht blockiert.
pub fn layer_shell_available() -> bool {
    with_timeout(PROBE_TIMEOUT, || {
        let Ok(conn) = Connection::connect_to_env() else {
            return false;
        };
        let Ok((globals, _queue)) = registry_queue_init::<Probe>(&conn) else {
            return false;
        };
        globals
            .contents()
            .with_list(|list| list.iter().any(|g| g.interface == "zwlr_layer_shell_v1"))
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Reine Timeout-Logik, kein Compositor noetig: eine haengende `body` darf
    /// `layer_shell_available` nicht mit aufhalten.
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
