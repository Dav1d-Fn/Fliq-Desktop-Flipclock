//! Live-Schnittstelle fuer tuxhub (Protokoll 1).
//!
//! Fliq lauscht auf `$XDG_RUNTIME_DIR/tuxhub/fliq.sock`. tuxhub verbindet sich, solange Fliq
//! laeuft, und zeigt die Einstellungen als eigene Seite an.
//! Protokoll: https://github.com/SirSnolte/tuxhub/blob/master/docs/tool-development.md#live-interface-level-3

use serde::Serialize;
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use std::io::{self, BufRead, BufReader, Read, Write};
use std::net::Shutdown;
use std::os::unix::fs::{DirBuilderExt, FileTypeExt, PermissionsExt};
use std::os::unix::net::{UnixListener, UnixStream};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

pub const PROTOCOL: u64 = 1;

/// Workshop-ID von Fliq in tuxhub, bestimmt den Namen des Sockets.
const ID: &str = "fliq";

/// Laengere Zeilen trennen die Verbindung, wie auf der Seite von tuxhub.
const MAX_LINE: usize = 1 << 20;

/// So lange wartet tuxhub auf eine Antwort. Spaeter muss sich niemand mehr merken, wohin sie
/// gehoert haette, und ein haengender Leser haelt die anderen Verbindungen nicht laenger auf.
const TIMEOUT: Duration = Duration::from_secs(5);

/// Eine Anfrage, die das Hauptfenster beantwortet (`schema`, `get`, `set`, `action`).
#[derive(Debug, Clone, Serialize)]
pub struct Forwarded {
    pub rid: u64,
    pub conn: u64,
    pub method: String,
    pub params: Value,
}

/// Was der Server nicht selbst erledigt. In der App ist das Tauri, in den Tests ein Ersatz.
pub trait Frontend: Send + Sync + 'static {
    fn request(&self, req: Forwarded);
    fn quit(&self);
}

/// `None` ohne (absolutes) `XDG_RUNTIME_DIR` -- dann bietet Fliq keine Schnittstelle an.
pub fn socket_path(runtime_dir: Option<PathBuf>) -> Option<PathBuf> {
    runtime_dir
        .filter(|p| p.is_absolute())
        .map(|p| p.join("tuxhub").join(format!("{ID}.sock")))
}

/// Ordner `0700`, Socket `0600`. Einen Socket, an dem niemand mehr lauscht (Absturz), ersetzt
/// das; lauscht dort noch jemand (zweite Fliq-Instanz), bleibt er stehen. Andere Dateien
/// werden nie geloescht.
fn bind(path: &Path) -> io::Result<UnixListener> {
    let dir = path
        .parent()
        .ok_or_else(|| io::Error::other("socket path without folder"))?;
    match std::fs::DirBuilder::new().mode(0o700).create(dir) {
        Ok(()) => {}
        Err(e) if e.kind() == io::ErrorKind::AlreadyExists => {
            if !std::fs::symlink_metadata(dir)?.is_dir() {
                return Err(io::Error::other(format!("{} is not a folder", dir.display())));
            }
        }
        Err(e) => return Err(e),
    }
    match std::fs::symlink_metadata(path) {
        Ok(m) if m.file_type().is_socket() => {
            if UnixStream::connect(path).is_ok() {
                return Err(io::Error::new(
                    io::ErrorKind::AddrInUse,
                    "another instance is listening",
                ));
            }
            std::fs::remove_file(path)?;
        }
        Ok(_) => {
            return Err(io::Error::new(
                io::ErrorKind::AlreadyExists,
                format!("{} is not a socket", path.display()),
            ))
        }
        Err(e) if e.kind() == io::ErrorKind::NotFound => {}
        Err(e) => return Err(e),
    }
    let listener = UnixListener::bind(path)?;
    std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600))?;
    Ok(listener)
}

struct Pending {
    conn: u64,
    id: Value,
    since: Instant,
}

/// Ein Thread nimmt Verbindungen an, je Verbindung liest ein weiterer. Geschrieben wird von
/// dort, wo die Antwort entsteht, ueber eine Kopie des Streams in `conns`.
pub struct Server {
    path: PathBuf,
    hello: Value,
    frontend: Box<dyn Frontend>,
    conns: Mutex<HashMap<u64, UnixStream>>,
    pending: Mutex<HashMap<u64, Pending>>,
    next: AtomicU64,
    stopped: AtomicBool,
}

impl Server {
    pub fn start(
        path: &Path,
        name: &str,
        version: &str,
        frontend: impl Frontend,
    ) -> io::Result<Arc<Server>> {
        let listener = bind(path)?;
        let server = Arc::new(Server {
            path: path.to_path_buf(),
            hello: json!({"protocol": PROTOCOL, "name": name, "version": version}),
            frontend: Box::new(frontend),
            conns: Mutex::new(HashMap::new()),
            pending: Mutex::new(HashMap::new()),
            next: AtomicU64::new(1),
            stopped: AtomicBool::new(false),
        });
        let s = server.clone();
        std::thread::Builder::new()
            .name("tuxhub".into())
            .spawn(move || s.accept(listener))?;
        Ok(server)
    }

    fn accept(self: Arc<Self>, listener: UnixListener) {
        for stream in listener.incoming() {
            if self.stopped.load(Ordering::SeqCst) {
                break;
            }
            let Ok(stream) = stream else { continue };
            let Ok(writer) = stream.try_clone() else { continue };
            let _ = writer.set_write_timeout(Some(TIMEOUT));
            let conn = self.next.fetch_add(1, Ordering::SeqCst);
            self.conns.lock().unwrap().insert(conn, writer);
            let s = self.clone();
            let spawned = std::thread::Builder::new()
                .name(format!("tuxhub-{conn}"))
                .spawn(move || {
                    s.read(conn, stream);
                    s.drop_conn(conn);
                });
            if spawned.is_err() {
                self.drop_conn(conn);
            }
        }
    }

    /// Kehrt zurueck, wenn die Verbindung endet oder gegen das Protokoll verstoesst.
    fn read(&self, conn: u64, stream: UnixStream) {
        let mut reader = BufReader::new(stream);
        let mut buf = Vec::new();
        loop {
            buf.clear();
            match (&mut reader)
                .take(MAX_LINE as u64 + 1)
                .read_until(b'\n', &mut buf)
            {
                Ok(0) | Err(_) => return,
                Ok(_) => {}
            }
            if buf.last() == Some(&b'\n') {
                buf.pop();
            } else if buf.len() > MAX_LINE {
                return;
            }
            if buf.iter().all(u8::is_ascii_whitespace) {
                continue;
            }
            let Ok(Value::Object(msg)) = serde_json::from_slice::<Value>(&buf) else {
                return;
            };
            self.handle(conn, msg);
        }
    }

    fn handle(&self, conn: u64, msg: Map<String, Value>) {
        // Ohne `id` ist es eine Benachrichtigung; von tuxhub kommen keine, unbekannte zaehlen nicht.
        let Some(id) = msg.get("id").filter(|id| !id.is_null()).cloned() else {
            return;
        };
        let params = msg.get("params").cloned().unwrap_or_else(|| json!({}));
        match msg.get("method").and_then(Value::as_str) {
            Some("hello") => self.send(conn, &json!({"id": id, "result": self.hello})),
            Some("quit") => {
                self.send(conn, &json!({"id": id, "result": true}));
                self.frontend.quit();
            }
            Some(method @ ("schema" | "get" | "set" | "action")) => {
                let rid = self.next.fetch_add(1, Ordering::SeqCst);
                {
                    let mut pending = self.pending.lock().unwrap();
                    pending.retain(|_, p| p.since.elapsed() < TIMEOUT * 2);
                    pending.insert(rid, Pending { conn, id, since: Instant::now() });
                }
                self.frontend.request(Forwarded {
                    rid,
                    conn,
                    method: method.into(),
                    params,
                });
            }
            Some(other) => {
                let name: String = other.chars().take(64).collect();
                self.send(
                    conn,
                    &json!({"id": id, "error": {"message": format!("unknown method {name:?}")}}),
                );
            }
            None => self.send(conn, &json!({"id": id, "error": {"message": "method is missing"}})),
        }
    }

    fn send(&self, conn: u64, msg: &Value) {
        let line = format!("{msg}\n");
        let failed = match self.conns.lock().unwrap().get_mut(&conn) {
            Some(w) => w.write_all(line.as_bytes()).is_err(),
            None => false,
        };
        if failed {
            self.drop_conn(conn);
        }
    }

    fn broadcast(&self, msg: &Value, exclude: Option<u64>) {
        let line = format!("{msg}\n");
        let failed: Vec<u64> = self
            .conns
            .lock()
            .unwrap()
            .iter_mut()
            .filter(|(conn, _)| Some(**conn) != exclude)
            .filter_map(|(conn, w)| w.write_all(line.as_bytes()).is_err().then_some(*conn))
            .collect();
        for conn in failed {
            self.drop_conn(conn);
        }
    }

    fn drop_conn(&self, conn: u64) {
        if let Some(w) = self.conns.lock().unwrap().remove(&conn) {
            let _ = w.shutdown(Shutdown::Both);
        }
        self.pending.lock().unwrap().retain(|_, p| p.conn != conn);
    }

    /// Antwort des Hauptfensters auf eine weitergereichte Anfrage.
    pub fn respond(&self, rid: u64, result: Option<Value>, error: Option<Value>) {
        let Some(p) = self.pending.lock().unwrap().remove(&rid) else {
            return;
        };
        let msg = match error {
            Some(e) => json!({"id": p.id, "error": e}),
            None => json!({"id": p.id, "result": result.unwrap_or(Value::Null)}),
        };
        self.send(p.conn, &msg);
    }

    /// `exclude`: die Verbindung, deren `set` die Aenderung ausgeloest hat.
    pub fn changed(&self, values: Value, exclude: Option<u64>) {
        self.broadcast(
            &json!({"method": "changed", "params": {"values": values}}),
            exclude,
        );
    }

    pub fn schema_changed(&self) {
        self.broadcast(&json!({"method": "schema-changed", "params": {}}), None);
    }

    /// Socket entfernen und alle Verbindungen schliessen. tuxhub wartet beim Beenden darauf.
    pub fn stop(&self) {
        if self.stopped.swap(true, Ordering::SeqCst) {
            return;
        }
        // Weckt das wartende `accept`, damit der Thread endet.
        let _ = UnixStream::connect(&self.path);
        let _ = std::fs::remove_file(&self.path);
        let conns: Vec<UnixStream> = self.conns.lock().unwrap().drain().map(|(_, w)| w).collect();
        for w in conns {
            let _ = w.shutdown(Shutdown::Both);
        }
    }
}

// --- Anbindung an Tauri ---

/// Der laufende Server, sobald das Hauptfenster bereit ist.
#[derive(Default)]
pub struct TuxhubState(Mutex<Option<Arc<Server>>>);

impl TuxhubState {
    fn server(&self) -> Option<Arc<Server>> {
        self.0.lock().unwrap().clone()
    }
}

struct Tauri(tauri::AppHandle);

impl Frontend for Tauri {
    fn request(&self, req: Forwarded) {
        use tauri::Emitter;
        if let Err(e) = self.0.emit_to("main", "tuxhub-request", req) {
            eprintln!("fliq: tuxhub-Anfrage nicht zugestellt: {e}");
        }
    }

    fn quit(&self) {
        self.0.exit(0);
    }
}

/// Das Hauptfenster kann Anfragen beantworten. Erst dann entsteht der Socket, denn sobald
/// tuxhub sich verbinden kann, fragt es nach Schema und Werten.
#[tauri::command]
pub fn tuxhub_ready(app: tauri::AppHandle, state: tauri::State<'_, TuxhubState>) {
    let mut server = state.0.lock().unwrap();
    // Nach einem Neuladen des Fensters laeuft der Server schon.
    if server.is_some() {
        return;
    }
    let Some(path) = socket_path(std::env::var_os("XDG_RUNTIME_DIR").map(PathBuf::from)) else {
        return;
    };
    let info = app.package_info();
    let (name, version) = (info.name.clone(), info.version.to_string());
    match Server::start(&path, &name, &version, Tauri(app)) {
        Ok(s) => *server = Some(s),
        Err(e) => eprintln!("fliq: tuxhub-Schnittstelle nicht verfuegbar ({}): {e}", path.display()),
    }
}

#[tauri::command]
pub fn tuxhub_respond(
    state: tauri::State<'_, TuxhubState>,
    rid: u64,
    result: Option<Value>,
    error: Option<Value>,
) {
    if let Some(s) = state.server() {
        s.respond(rid, result, error);
    }
}

#[tauri::command]
pub fn tuxhub_changed(state: tauri::State<'_, TuxhubState>, values: Value, exclude: Option<u64>) {
    if let Some(s) = state.server() {
        s.changed(values, exclude);
    }
}

#[tauri::command]
pub fn tuxhub_schema_changed(state: tauri::State<'_, TuxhubState>) {
    if let Some(s) = state.server() {
        s.schema_changed();
    }
}

/// Fuer Werte, die Rust selbst haelt (Overlay-Modus).
pub fn changed(app: &tauri::AppHandle, values: Value) {
    use tauri::Manager;
    if let Some(s) = app.try_state::<TuxhubState>().and_then(|st| st.server()) {
        s.changed(values, None);
    }
}

pub fn stop(app: &tauri::AppHandle) {
    use tauri::Manager;
    if let Some(s) = app.try_state::<TuxhubState>().and_then(|st| st.server()) {
        s.stop();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::io::{BufRead, BufReader, Write};
    use std::os::unix::fs::PermissionsExt;
    use std::os::unix::net::{UnixListener, UnixStream};
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::mpsc;
    use std::time::Duration;

    struct Fake {
        tx: std::sync::Mutex<mpsc::Sender<Forwarded>>,
        quit: Arc<AtomicBool>,
    }

    impl Frontend for Fake {
        fn request(&self, req: Forwarded) {
            let _ = self.tx.lock().unwrap().send(req);
        }
        fn quit(&self) {
            self.quit.store(true, Ordering::SeqCst);
        }
    }

    struct Setup {
        dir: PathBuf,
        path: PathBuf,
    }

    impl Drop for Setup {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.dir);
        }
    }

    /// Kurzer Pfad: Unix-Sockets vertragen hoechstens 107 Bytes.
    fn setup(name: &str) -> Setup {
        let dir = PathBuf::from(format!("/tmp/fliq-th-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let path = socket_path(Some(dir.clone())).unwrap();
        Setup { dir, path }
    }

    fn server(path: &Path) -> (Arc<Server>, mpsc::Receiver<Forwarded>, Arc<AtomicBool>) {
        let (tx, rx) = mpsc::channel();
        let quit = Arc::new(AtomicBool::new(false));
        let fake = Fake {
            tx: std::sync::Mutex::new(tx),
            quit: quit.clone(),
        };
        let s = Server::start(path, "Fliq", "1.4.0", fake).expect("server must start");
        (s, rx, quit)
    }

    struct Client {
        reader: BufReader<UnixStream>,
        writer: UnixStream,
    }

    impl Client {
        fn connect(path: &Path) -> Client {
            let s = UnixStream::connect(path).unwrap();
            s.set_read_timeout(Some(Duration::from_secs(2))).unwrap();
            Client {
                writer: s.try_clone().unwrap(),
                reader: BufReader::new(s),
            }
        }
        fn send(&mut self, v: Value) {
            writeln!(self.writer, "{v}").unwrap();
        }
        fn recv(&mut self) -> Value {
            let mut line = String::new();
            self.reader.read_line(&mut line).expect("expected a line");
            serde_json::from_str(&line).expect("expected JSON")
        }
        /// `true`, wenn die Gegenseite die Verbindung geschlossen hat.
        fn closed(&mut self) -> bool {
            let mut line = String::new();
            matches!(self.reader.read_line(&mut line), Ok(0))
        }
        /// `true`, wenn innerhalb kurzer Zeit nichts ankommt.
        fn silent(&mut self) -> bool {
            self.reader
                .get_ref()
                .set_read_timeout(Some(Duration::from_millis(300)))
                .unwrap();
            let mut line = String::new();
            let r = self.reader.read_line(&mut line);
            self.reader
                .get_ref()
                .set_read_timeout(Some(Duration::from_secs(2)))
                .unwrap();
            matches!(r, Err(ref e) if e.kind() == io::ErrorKind::WouldBlock || e.kind() == io::ErrorKind::TimedOut)
        }
    }

    fn forwarded(rx: &mpsc::Receiver<Forwarded>) -> Forwarded {
        rx.recv_timeout(Duration::from_secs(2))
            .expect("request must reach the frontend")
    }

    #[test]
    fn socket_path_needs_an_absolute_runtime_dir() {
        assert_eq!(socket_path(None), None);
        assert_eq!(socket_path(Some(PathBuf::from("run/user/1000"))), None);
        assert_eq!(
            socket_path(Some(PathBuf::from("/run/user/1000"))),
            Some(PathBuf::from("/run/user/1000/tuxhub/fliq.sock"))
        );
    }

    #[test]
    fn folder_and_socket_are_private() {
        let t = setup("modes");
        let (s, _rx, _q) = server(&t.path);
        let mode = |p: &Path| std::fs::metadata(p).unwrap().permissions().mode() & 0o777;
        assert_eq!(mode(t.path.parent().unwrap()), 0o700);
        assert_eq!(mode(&t.path), 0o600);
        s.stop();
    }

    #[test]
    fn stale_socket_is_replaced() {
        let t = setup("stale");
        std::fs::create_dir_all(t.path.parent().unwrap()).unwrap();
        drop(UnixListener::bind(&t.path).unwrap()); // Datei bleibt, niemand lauscht
        let (s, _rx, _q) = server(&t.path);
        let mut c = Client::connect(&t.path);
        c.send(json!({"id": 1, "method": "hello", "params": {"protocol": 1}}));
        assert_eq!(c.recv()["id"], 1);
        s.stop();
    }

    #[test]
    fn listening_socket_is_left_alone() {
        let t = setup("busy");
        std::fs::create_dir_all(t.path.parent().unwrap()).unwrap();
        let _other = UnixListener::bind(&t.path).unwrap();
        let (tx, _rx) = mpsc::channel();
        let fake = Fake {
            tx: std::sync::Mutex::new(tx),
            quit: Arc::new(AtomicBool::new(false)),
        };
        let err = Server::start(&t.path, "Fliq", "1.4.0", fake)
            .err()
            .expect("must not start");
        assert_eq!(err.kind(), io::ErrorKind::AddrInUse);
        assert!(
            UnixStream::connect(&t.path).is_ok(),
            "the other socket must survive"
        );
    }

    #[test]
    fn other_files_are_not_removed() {
        let t = setup("file");
        std::fs::create_dir_all(t.path.parent().unwrap()).unwrap();
        std::fs::write(&t.path, "keep").unwrap();
        let (tx, _rx) = mpsc::channel();
        let fake = Fake {
            tx: std::sync::Mutex::new(tx),
            quit: Arc::new(AtomicBool::new(false)),
        };
        assert!(Server::start(&t.path, "Fliq", "1.4.0", fake).is_err());
        assert_eq!(std::fs::read_to_string(&t.path).unwrap(), "keep");
    }

    #[test]
    fn hello_names_protocol_and_version() {
        let t = setup("hello");
        let (s, _rx, _q) = server(&t.path);
        let mut c = Client::connect(&t.path);
        c.send(json!({"id": 1, "method": "hello",
            "params": {"protocol": 1, "client": "tuxhub", "version": "0.5.0", "locale": "de"}}));
        assert_eq!(
            c.recv(),
            json!({"id": 1, "result": {"protocol": 1, "name": "Fliq", "version": "1.4.0"}})
        );
        s.stop();
    }

    #[test]
    fn requests_go_to_the_frontend_and_back() {
        let t = setup("fwd");
        let (s, rx, _q) = server(&t.path);
        let mut c = Client::connect(&t.path);
        c.send(
            json!({"id": 7, "method": "set", "params": {"key": "textColor", "value": "#ff0000ff"}}),
        );
        let f = forwarded(&rx);
        assert_eq!(f.method, "set");
        assert_eq!(f.params, json!({"key": "textColor", "value": "#ff0000ff"}));
        s.respond(f.rid, Some(json!({"value": "#ff0000ff"})), None);
        assert_eq!(c.recv(), json!({"id": 7, "result": {"value": "#ff0000ff"}}));

        c.send(
            json!({"id": "x", "method": "set", "params": {"key": "clockTextSize", "value": 900}}),
        );
        let f = forwarded(&rx);
        s.respond(
            f.rid,
            None,
            Some(json!({"message": "too big", "field": "clockTextSize"})),
        );
        assert_eq!(
            c.recv(),
            json!({"id": "x", "error": {"message": "too big", "field": "clockTextSize"}})
        );
        // Eine zweite Antwort auf dieselbe Anfrage geht nirgends hin.
        s.respond(f.rid, Some(json!(true)), None);
        assert!(c.silent());
        s.stop();
    }

    #[test]
    fn unknown_methods_are_refused() {
        let t = setup("unknown");
        let (s, rx, _q) = server(&t.path);
        let mut c = Client::connect(&t.path);
        c.send(json!({"id": 3, "method": "launch-missiles", "params": {}}));
        let r = c.recv();
        assert_eq!(r["id"], 3);
        assert!(r["error"]["message"].is_string());
        assert!(rx.try_recv().is_err());
        // Benachrichtigungen ohne `id` bekommen keine Antwort.
        c.send(json!({"method": "something-new", "params": {}}));
        assert!(c.silent());
        s.stop();
    }

    #[test]
    fn overlong_line_closes_the_connection() {
        let t = setup("long");
        let (s, _rx, _q) = server(&t.path);
        let mut c = Client::connect(&t.path);
        let junk = vec![b'a'; (1 << 20) + 1];
        let _ = c.writer.write_all(&junk);
        assert!(c.closed());
        s.stop();
    }

    #[test]
    fn invalid_json_closes_the_connection() {
        let t = setup("json");
        let (s, _rx, _q) = server(&t.path);
        let mut c = Client::connect(&t.path);
        writeln!(c.writer, "not json").unwrap();
        assert!(c.closed());
        let mut c = Client::connect(&t.path);
        writeln!(c.writer, "[1, 2]").unwrap();
        assert!(c.closed());
        s.stop();
    }

    #[test]
    fn changed_reaches_every_connection_but_the_excluded_one() {
        let t = setup("changed");
        let (s, rx, _q) = server(&t.path);
        let mut a = Client::connect(&t.path);
        let mut b = Client::connect(&t.path);
        a.send(json!({"id": 1, "method": "get", "params": {}}));
        let conn_a = forwarded(&rx).conn;
        b.send(json!({"id": 1, "method": "get", "params": {}}));
        forwarded(&rx);

        s.changed(json!({"textColor": "#ff0000ff"}), Some(conn_a));
        let msg = json!({"method": "changed", "params": {"values": {"textColor": "#ff0000ff"}}});
        assert_eq!(b.recv(), msg);
        assert!(a.silent());

        s.changed(json!({"textColor": "#ff0000ff"}), None);
        assert_eq!(a.recv(), msg);
        assert_eq!(b.recv(), msg);

        s.schema_changed();
        let msg = json!({"method": "schema-changed", "params": {}});
        assert_eq!(a.recv(), msg);
        assert_eq!(b.recv(), msg);
        s.stop();
    }

    #[test]
    fn closed_connection_does_not_disturb_the_others() {
        let t = setup("gone");
        let (s, rx, _q) = server(&t.path);
        let mut a = Client::connect(&t.path);
        let mut b = Client::connect(&t.path);
        b.send(json!({"id": 1, "method": "get", "params": {}}));
        forwarded(&rx);
        a.send(json!({"id": 1, "method": "get", "params": {}}));
        let f = forwarded(&rx);
        drop(a);
        std::thread::sleep(Duration::from_millis(100));
        s.respond(f.rid, Some(json!({"values": {}})), None);
        s.changed(json!({"lang": "de"}), None);
        assert_eq!(b.recv()["params"]["values"]["lang"], "de");
        s.stop();
    }

    #[test]
    fn quit_answers_first_and_then_quits() {
        let t = setup("quit");
        let (s, _rx, quit) = server(&t.path);
        let mut c = Client::connect(&t.path);
        c.send(json!({"id": 9, "method": "quit", "params": {}}));
        assert_eq!(c.recv(), json!({"id": 9, "result": true}));
        std::thread::sleep(Duration::from_millis(100));
        assert!(quit.load(Ordering::SeqCst));
        s.stop();
    }

    #[test]
    fn stop_removes_the_socket() {
        let t = setup("stop");
        let (s, _rx, _q) = server(&t.path);
        let mut c = Client::connect(&t.path);
        s.stop();
        assert!(!t.path.exists());
        assert!(c.closed());
    }
}
