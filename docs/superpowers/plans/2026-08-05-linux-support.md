# Fliq Linux-Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fliq läuft als rahmenloses Always-on-Top-Widget auf KDE, GNOME, XFCE und Cinnamon — auf Compositors mit `zwlr_layer_shell_v1` auch über Fullscreen-Fenstern — ohne den bestehenden Windows-Support zu brechen.

**Architecture:** Ein Binary mit zwei Overlay-Modi, die einmalig beim Start gewählt werden. Modus *Layer-Shell* macht das GTK-Fenster vor dem Realize zu einem Layer-Surface auf dem `overlay`-Layer. Modus *X11* erzwingt `GDK_BACKEND=x11` und nutzt `keep_above` + `skip_taskbar`. Die Wahl trifft ein Wayland-Registry-Probe vor jeder GTK-Initialisierung, überschreibbar per Einstellung.

**Tech Stack:** Tauri 2 (stable), React 18, TypeScript, Vite, Mantine 7, Jotai, Rust 2021, GTK3 via `gtk` 0.18, `wayland-client` 0.31, System-Bibliothek `gtk-layer-shell` 0.10 (GTK3) über direktes FFI.

## Global Constraints

- Tauri-Zielversion: `2` (aktuell `2.11.5`), sowohl Rust-Crates als auch `@tauri-apps/*`-Pakete.
- Kein `gtk-layer-shell`-Rust-Crate — die Crate ist auf crates.io als UNMAINTAINED markiert. Die sechs benötigten C-Funktionen werden per `extern "C"` gebunden.
- Sämtlicher Linux-spezifischer Code steht hinter `#[cfg(target_os = "linux")]`. Windows- und macOS-Builds dürfen nicht brechen.
- Reine Logik (`LinuxConfig`, `detect_mode`) kompiliert und testet auf **allen** Plattformen — nur FFI und Compositor-Zugriff sind cfg-gated. Sonst laufen die Tests in der Windows-CI nicht.
- App-Identifier für Pfade: `com.flipclock.dev`.
- Config-Datei: `$XDG_CONFIG_HOME/com.flipclock.dev/linux.json`, Fallback `$HOME/.config/com.flipclock.dev/linux.json`.
- Default-Margins: `40` / `40`. Default-Preference: `auto`.
- Mode-Strings an der Frontend-Grenze: `"layer-shell"`, `"x11"`, `"native"`. `"native"` bedeutet Windows/macOS.
- CI-Linux-Runner: `ubuntu-22.04` (nicht 24.04 — baut gegen ältere glibc/WebKit, läuft dadurch auch auf neueren Systemen).
- Commit nach jedem Task. Branch: `linux-support`.

## File Structure

| Datei | Verantwortung |
|---|---|
| `src-tauri/src/overlay/mod.rs` | *neu* — `ModePreference`, `OverlayMode`, `LinuxConfig`, `detect_mode`. Reine Logik, plattformunabhängig, unit-getestet. |
| `src-tauri/src/overlay/linux.rs` | *neu* — FFI zu gtk-layer-shell, Wayland-Registry-Probe, `apply`, `set_margin`. Komplett `#[cfg(target_os = "linux")]`. |
| `src-tauri/src/lib.rs` | Tauri-Builder, Commands. Bleibt schlank: ein `overlay::apply`-Aufruf in `setup()`. |
| `src-tauri/src/main.rs` | Moduswahl **vor** GTK-Init, `GDK_BACKEND` setzen, Modus an `lib.rs` reichen. |
| `src-tauri/build.rs` | Link-Flag für `gtk-layer-shell` unter Linux. |
| `src-tauri/tauri.conf.json` | `"visible": false` für das Hauptfenster, Linux-Bundle-Dependencies. |
| `src-tauri/capabilities/main-capability.json` | Permission-Identifier auf `core:`-Präfix migrieren, `core:window:allow-show` ergänzen. |
| `src/pages/App.tsx` | JS-API-Migration, Drag-Weiche nach Overlay-Modus. |
| `src/pages/StylingMenu.tsx` | Dropdown für den Overlay-Modus, nur unter Linux sichtbar. |
| `src/pages/atoms.ts` | Settings-Sync — wird nach Messung eingedampft oder entfernt. |
| `.github/workflows/release.yml` | *neu* — Matrix-Build Linux + Windows, Artefakte an den Release. |
| `README.md` | Linux-Installationsabschnitt und Support-Matrix. |

**Abhängigkeitsreihenfolge:** Task 1 (Upgrade) und Task 2 (Sync-Messung) sind Voraussetzung für alles Weitere. Task 3 und 4 sind reine Logik ohne UI. Task 5 verdrahtet sie. Ab Task 5 läuft die App nach jedem Task.

---

### Task 1: Tauri 2 stable Upgrade

Ein Task, weil ein halbes Upgrade nicht lauffähig ist: Rust-Crates und JS-Pakete müssen zusammen wandern.

**Files:**
- Modify: `src-tauri/Cargo.toml:15-23`
- Modify: `package.json:12-25`
- Modify: `src-tauri/capabilities/main-capability.json`
- Modify: `src/pages/App.tsx:9-14,60-98,145-149,165-200`
- Modify: `src-tauri/src/lib.rs:6-23`

**Interfaces:**
- Consumes: nichts
- Produces: lauffähige App auf Tauri 2 stable. Alle Folgetasks setzen die stable JS-API voraus (`getCurrentWindow`, `getAllWindows`, `@tauri-apps/api/dpi`).

- [ ] **Step 1: Rust-Dependencies auf stable heben**

`src-tauri/Cargo.toml` — die `[build-dependencies]` und `[dependencies]` Blöcke ersetzen:

```toml
[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["image-png"] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tauri-plugin-autostart = "2"
tauri-plugin-window-state = "2"

[target.'cfg(target_os = "linux")'.dependencies]
gtk = { version = "0.18" }
```

- [ ] **Step 2: Rust-Build prüfen**

Run: `cd src-tauri && cargo check 2>&1 | tail -30`
Expected: Kompiliert. Falls `tauri_plugin_autostart::MacosLauncher` nicht mehr auflösbar ist, ist der Pfad in `lib.rs:28` anzupassen — in stable liegt der Typ weiterhin unter diesem Pfad, der Aufruf sollte unverändert bauen.

- [ ] **Step 3: JS-Dependencies heben**

`package.json` — diese Versionsangaben ersetzen:

```json
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-autostart": "^2",
    "@tauri-apps/plugin-shell": "^2",
    "@tauri-apps/plugin-window-state": "^2",
```

und in `devDependencies`:

```json
    "@tauri-apps/cli": "^2",
```

Dann: `npm install`

- [ ] **Step 4: Imports in App.tsx migrieren**

`src/pages/App.tsx` Zeilen 9-14 ersetzen. In stable heißen die Getter `getCurrentWindow`/`getAllWindows`, und die DPI-Typen liegen in `@tauri-apps/api/dpi`:

```tsx
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow, getAllWindows } from '@tauri-apps/api/window'
import { PhysicalPosition, LogicalSize } from '@tauri-apps/api/dpi'
import { Webview } from '@tauri-apps/api/webview';
import { CheckMenuItem, Menu, MenuItem } from '@tauri-apps/api/menu'
import { enable, disable } from '@tauri-apps/plugin-autostart';
import { saveWindowState, StateFlags, restoreStateCurrent } from '@tauri-apps/plugin-window-state';
```

- [ ] **Step 5: Alle `getCurrent()`- und `getAll()`-Aufrufstellen umbenennen**

Run: `grep -n "getCurrent()\|getAll()" src/pages/App.tsx`
Erwartet werden Treffer in den Zeilen 60, 61, 73, 75, 98, 128, 130, 165, 168, 176, 179, 191.

Ersetze in `src/pages/App.tsx` jedes `getCurrent()` durch `getCurrentWindow()` und jedes `getAll()` durch `getAllWindows()`.

Achtung bei Zeile 73 und 128 — dort steht `getCurrent` ohne Klammern in einer `typeof`-Prüfung:

```tsx
      if (typeof LogicalSize !== "undefined" && typeof getCurrentWindow === "function") {
```

Achtung bei Zeile 191 — `getAllWindows()` ist in stable async:

```tsx
    const exitItem = await MenuItem.new({enabled:true ,text: "Exit", action: async () => { (await getAllWindows()).forEach( window => { window.close(); }); }});
```

- [ ] **Step 6: `Webview.getByLabel` als async behandeln**

In stable ist `Webview.getByLabel` async. Ohne `await` ist der Guard in `src/pages/App.tsx:146` wirkungslos — ein Promise ist immer truthy —, und der Rust-Command dahinter panict beim zweiten Öffnen an seinem `.unwrap()`.

`src/pages/App.tsx` Zeilen 145-149 ersetzen:

```tsx
  //Open the styling window
  async function open_stylingmenu() {
    const existing = await Webview.getByLabel('Styling');
    if (!existing) {
      await invoke("open_stylingmenu_window");
    }
    console.log("Window was opened");
  }
```

- [ ] **Step 7: Rust-Seite gegen den Doppelklick absichern**

Selbst mit dem Guard bleibt ein Rennen zwischen zwei schnellen Klicks. `src-tauri/src/lib.rs` Zeilen 6-23 ersetzen:

```rust
// Window definition for the styling menu
#[tauri::command]
async fn open_stylingmenu_window(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;

    if let Some(existing) = app.get_webview_window("Styling") {
        let _ = existing.set_focus();
        return Ok(());
    }

    tauri::WebviewWindowBuilder::new(
        &app,
        "Styling", /* the unique window label */
        tauri::WebviewUrl::App("stylingMenu.html".into()),
    )
    .inner_size(900.0, 500.0)
    .resizable(true)
    .title("Styling")
    .build()
    .map(|_| ())
    .map_err(|e| e.to_string())
}
```

- [ ] **Step 8: Kontextmenü-Workaround zurückbauen**

Der `screenX * dpr`-Workaround war gegen die beta gerichtet. Er wird entfernt, damit Step 11 das tatsächliche Verhalten von stable misst statt eines korrigierten. `src/pages/App.tsx` Zeilen 195-200 ersetzen:

```tsx
    const position: PhysicalPosition = new PhysicalPosition(e.clientX, e.clientY);
    await menu.popup(position);
```

`preventDefault`/`stopPropagation` in Zeile 205 bleiben unverändert — die verhindern WebKitGTKs Eigenmenü und werden weiter gebraucht.

- [ ] **Step 9: Capabilities auf das `core:`-Präfix migrieren**

Tauri 2 stable präfixt die eingebauten Permissions mit `core:`. `src-tauri/capabilities/main-capability.json` komplett ersetzen:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "main-capability",
  "description": "Capability for the main window",
  "windows": ["main", "Styling"],
  "permissions": [
    "core:path:default",
    "core:event:default",
    "core:window:default",
    "core:app:default",
    "core:resources:default",
    "core:menu:default",
    "core:image:default",
    "core:webview:default",
    "core:window:allow-set-title",
    "core:window:allow-set-always-on-top",
    "core:window:allow-start-dragging",
    "core:window:allow-set-skip-taskbar",
    "core:window:allow-set-size",
    "core:window:allow-set-resizable",
    "core:window:allow-set-maximizable",
    "core:window:allow-close",
    "core:window:allow-show",
    "core:menu:allow-new",
    "core:menu:allow-append",
    "core:menu:allow-popup",
    "core:image:allow-from-path",
    "autostart:default",
    "autostart:allow-enable",
    "autostart:allow-disable",
    "autostart:allow-is-enabled",
    "window-state:allow-restore-state",
    "window-state:allow-save-window-state",
    "shell:allow-open"
  ]
}
```

`core:window:allow-show` ist neu und wird ab Task 5 gebraucht, wenn das Fenster unsichtbar startet. `core:tray:default` entfällt — es gibt kein Tray-Icon in diesem Projekt.

- [ ] **Step 10: Frontend-Build prüfen**

Run: `npm run build`
Expected: PASS, keine TypeScript-Fehler. Bei Fehlern zu `getCurrentWindow`/`getAllWindows` Step 5 nachziehen.

- [ ] **Step 11: App starten und Verhalten messen**

Run: `npm run tauri dev`

Prüfen und **notieren** (die Ergebnisse steuern Task 2 und die spätere Menü-Entscheidung):
1. Fenster erscheint, rahmenlos und transparent?
2. Rechtsklickmenü — erscheint es an der Mausposition oder versetzt? Falls versetzt: um wieviel, und skaliert der Versatz mit `devicePixelRatio`?
3. Ziehen mit gedrückter linker Maustaste — funktioniert es?
4. Settings-Fenster öffnet sich, zweimaliges Öffnen panict nicht?

- [ ] **Step 12: Menü-Position nachziehen, falls nötig**

Nur ausführen, wenn Step 11.2 einen Versatz gezeigt hat. Ist die Position um genau den Faktor `devicePixelRatio` daneben, in `src/pages/App.tsx` ersetzen:

```tsx
    const dpr = window.devicePixelRatio ?? 1;
    const position: PhysicalPosition = new PhysicalPosition(
      Math.round(e.clientX * dpr),
      Math.round(e.clientY * dpr)
    );
    await menu.popup(position);
```

War die Position in Step 11 korrekt, bleibt der Code aus Step 8 unverändert und dieser Schritt entfällt.

- [ ] **Step 13: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock package.json package-lock.json src-tauri/capabilities/main-capability.json src/pages/App.tsx src-tauri/src/lib.rs
git commit -m "chore: upgrade Tauri 2.0.0-beta.19 to 2 stable"
```

- [ ] **Step 14: Windows-Gegentest anfordern**

Dieser Schritt ist ein **Stopp-Punkt**. Der Branch wird gepusht, und der Autor prüft auf seinem Windows-System: Fenster rahmenlos und transparent, Ziehen, Rechtsklickmenü an der Mausposition, Settings-Fenster, Autostart, Position überlebt Neustart.

Erst nach dieser Bestätigung geht es weiter. Ein gebrochener Windows-Build, der erst in Task 8 auffällt, kostet ungleich mehr.

---

### Task 2: Settings-Sync vermessen und eindampfen

**Files:**
- Modify: `src/pages/atoms.ts`

**Interfaces:**
- Consumes: lauffähige App aus Task 1
- Produces: `ATOMS`-Objekt mit unverändertem Schlüsselsatz und unveränderter Nutzung (`useAtom(ATOMS.X)`). Alle Konsumenten in `App.tsx` und `StylingMenu.tsx` bleiben unangetastet.

- [ ] **Step 1: Messen, ob die Webviews sich localStorage teilen**

App starten (`npm run tauri dev`), Settings-Fenster öffnen. In der DevTools-Konsole des **Settings**-Fensters:

```js
localStorage.setItem("fliq-sync-probe", "written-by-styling-window")
```

Dann in der DevTools-Konsole des **Uhr**-Fensters:

```js
localStorage.getItem("fliq-sync-probe")
```

Ergebnis notieren:
- `"written-by-styling-window"` → Store ist geteilt → **Fall A**
- `null` → Store ist getrennt → **Fall B**

Aufräumen: `localStorage.removeItem("fliq-sync-probe")` in beiden Fenstern.

- [ ] **Step 2 (nur Fall A): atoms.ts auf den Originalzustand zurückbauen**

Teilen sich die Webviews den Store, ist der gesamte Sync-Apparat überflüssig. `src/pages/atoms.ts` komplett ersetzen:

```ts
import { atomWithStorage } from "jotai/utils";

export const ATOMS = {
  LANGUAGE: atomWithStorage("lang", "en"),
  AUTOSTART: atomWithStorage("autostart", false),
  HIDE_IN_TASKBAR: atomWithStorage("hideInTaskbar", true),
  ALWAYS_ON_TOP: atomWithStorage("alwaysOnTop", true),
  TEXT_FONT: atomWithStorage("textFont", "Arial, sans-serif"),
  TEXT_COLOR: atomWithStorage("textColor", "#fafafaff"),
  TIME_FORMAT: atomWithStorage("format", "$FLIPTIME(HH:mm:ss)"),
  SEPARATOR_STRING: atomWithStorage("seperatorString", " /\\,.:"),
  CLOCK_PADDING: atomWithStorage("clockPadding", 17), // Padding in px
  CLOCK_TEXT_COLOR: atomWithStorage("clockTextColor", "#fafafaff"),
  CLOCK_TEXT_SIZE: atomWithStorage("clockTextSize", 26), // Text Size in px
  CLOCK_SEPARATOR_COLOR: atomWithStorage("clockSeparatorColor", "#fafafaff"),
  FLIPCARD_BACKGROUND: atomWithStorage("flipCardBackground", "#171717ff"),
  FLIPCARD_RADIUS: atomWithStorage("flipcardRounded", 70), // Rounding in %
  BOX_BACKGROUND: atomWithStorage("boxBackgroundColor", "#121212ab"),
  BOX_RADIUS: atomWithStorage("boxRounded", 30), // Rounding in %
  SECOND_ROW_ENABLED: atomWithStorage("secondRowEnabled", true),
  SECOND_ROW_CLOCK_TEXT_SIZE: atomWithStorage("secondRowClockTextSize", 12), // Text Size in px
  SECOND_ROW_TIME_FORMAT: atomWithStorage("secondRowFormat", "$TIME(dddd, DD.MM) $TEXT( ) $WEATHER(feelsLikeEmoji) $TEXT( ) $WEATHER(nextSun)"),
  SECOND_ROW_GAP: atomWithStorage("secondRowGap", 9), // Gap in px
  WEATHER_DATA: atomWithStorage("weatherData", null),
  WEATHER_LOCATION: atomWithStorage("weatherLocation", ""), // Default location for weather data
  WEATHER_UNIT: atomWithStorage("weatherUnit", "C"),
  SUN_TIMES: atomWithStorage("sunTimes", null), // Store sunrise/sunset times
};
```

- [ ] **Step 3 (nur Fall B): atoms.ts auf den Tauri-Event-Pfad reduzieren**

Sind die Stores getrennt, wird die Synchronisation gebraucht — aber nur über den Tauri-Event-Bus. `BroadcastChannel` verbindet ausschließlich Kontexte desselben Origins im selben Prozess; bei getrennten WebKit-Prozessen kommt dort nie eine Message an. Der `SETTINGS_STORAGE_APPLIED`-CustomEvent existierte nur, um beide Pfade zusammenzuführen, und entfällt mit.

`src/pages/atoms.ts` komplett ersetzen:

```ts
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { emit, listen } from "@tauri-apps/api/event";

const SYNC_EVENT = "fliq-settings-storage";

const base = createJSONStorage<any>(() => localStorage);

/** Empfänger: schreibt fremde Änderungen in das eigene localStorage und meldet sie an die Atome. */
const subscribers = new Map<string, Set<(raw: string | null) => void>>();

void listen<{ key: string; raw: string | null }>(SYNC_EVENT, (e) => {
  const { key, raw } = e.payload;
  if (!key) return;
  if (localStorage.getItem(key) === raw) return;
  if (raw === null) localStorage.removeItem(key);
  else localStorage.setItem(key, raw);
  subscribers.get(key)?.forEach((fn) => fn(raw));
}).catch(() => {
  /* im reinen Browser (vite dev ohne Tauri) gibt es keinen Event-Bus */
});

function atomWithSharedStorage<T>(key: string, initialValue: T) {
  return atomWithStorage<T>(
    key,
    initialValue,
    {
      getItem: (k, fallback) => base.getItem(k, fallback),
      setItem: (k, value) => {
        base.setItem(k, value);
        void emit(SYNC_EVENT, { key: k, raw: localStorage.getItem(k) }).catch(() => {});
      },
      removeItem: (k) => {
        base.removeItem(k);
        void emit(SYNC_EVENT, { key: k, raw: null }).catch(() => {});
      },
      subscribe: (k, callback, fallback) => {
        const fn = () => callback(base.getItem(k, fallback));
        if (!subscribers.has(k)) subscribers.set(k, new Set());
        subscribers.get(k)!.add(fn);
        return () => { subscribers.get(k)?.delete(fn); };
      },
    },
    { getOnInit: true }
  );
}

export const ATOMS = {
  LANGUAGE: atomWithSharedStorage("lang", "en"),
  AUTOSTART: atomWithSharedStorage("autostart", false),
  HIDE_IN_TASKBAR: atomWithSharedStorage("hideInTaskbar", true),
  ALWAYS_ON_TOP: atomWithSharedStorage("alwaysOnTop", true),
  TEXT_FONT: atomWithSharedStorage("textFont", "Arial, sans-serif"),
  TEXT_COLOR: atomWithSharedStorage("textColor", "#fafafaff"),
  TIME_FORMAT: atomWithSharedStorage("format", "$FLIPTIME(HH:mm:ss)"),
  SEPARATOR_STRING: atomWithSharedStorage("seperatorString", " /\\,.:"),
  CLOCK_PADDING: atomWithSharedStorage("clockPadding", 17), // Padding in px
  CLOCK_TEXT_COLOR: atomWithSharedStorage("clockTextColor", "#fafafaff"),
  CLOCK_TEXT_SIZE: atomWithSharedStorage("clockTextSize", 26), // Text Size in px
  CLOCK_SEPARATOR_COLOR: atomWithSharedStorage("clockSeparatorColor", "#fafafaff"),
  FLIPCARD_BACKGROUND: atomWithSharedStorage("flipCardBackground", "#171717ff"),
  FLIPCARD_RADIUS: atomWithSharedStorage("flipcardRounded", 70), // Rounding in %
  BOX_BACKGROUND: atomWithSharedStorage("boxBackgroundColor", "#121212ab"),
  BOX_RADIUS: atomWithSharedStorage("boxRounded", 30), // Rounding in %
  SECOND_ROW_ENABLED: atomWithSharedStorage("secondRowEnabled", true),
  SECOND_ROW_CLOCK_TEXT_SIZE: atomWithSharedStorage("secondRowClockTextSize", 12), // Text Size in px
  SECOND_ROW_TIME_FORMAT: atomWithSharedStorage("secondRowFormat", "$TIME(dddd, DD.MM) $TEXT( ) $WEATHER(feelsLikeEmoji) $TEXT( ) $WEATHER(nextSun)"),
  SECOND_ROW_GAP: atomWithSharedStorage("secondRowGap", 9), // Gap in px
  WEATHER_DATA: atomWithSharedStorage("weatherData", null),
  WEATHER_LOCATION: atomWithSharedStorage("weatherLocation", ""), // Default location for weather data
  WEATHER_UNIT: atomWithSharedStorage("weatherUnit", "C"),
  SUN_TIMES: atomWithSharedStorage("sunTimes", null), // Store sunrise/sunset times
};
```

- [ ] **Step 4: Synchronisation verifizieren**

Run: `npm run tauri dev`

Settings-Fenster öffnen, die Textfarbe ändern. Die Uhr muss die Änderung **ohne Neustart** übernehmen. Danach Settings-Fenster schließen, App neu starten — die Farbe muss erhalten sein.

Schlägt das in Fall B fehl, ist `emit`/`listen` nicht der tragende Pfad; dann in den DevTools beider Fenster prüfen, ob das Event überhaupt ankommt (`listen` im Uhr-Fenster manuell registrieren und im Settings-Fenster `emit` auslösen), bevor Code geändert wird.

- [ ] **Step 5: Commit**

```bash
git add src/pages/atoms.ts
git commit -m "refactor: reduce settings sync to what the platform actually needs"
```

---

### Task 3: LinuxConfig — Rust-lesbare Einstellungen

Die erste von zwei reinen Logik-Einheiten. Testbar ohne Compositor, kompiliert auf allen Plattformen.

**Files:**
- Create: `src-tauri/src/overlay/mod.rs`
- Modify: `src-tauri/src/lib.rs` (Modul einhängen)

**Interfaces:**
- Consumes: nichts
- Produces:
  - `pub enum ModePreference { Auto, LayerShell, X11 }` mit `Default = Auto`, serde `rename_all = "kebab-case"`
  - `pub enum OverlayMode { LayerShell, X11 }`
  - `pub struct LinuxConfig { pub overlay_mode: ModePreference, pub margin_x: i32, pub margin_y: i32 }`
  - `LinuxConfig::default() -> Self` (`Auto`, 40, 40)
  - `LinuxConfig::default_path() -> Option<PathBuf>`
  - `LinuxConfig::load_from(path: &Path) -> Self` (nie panisch, fällt auf Default)
  - `LinuxConfig::save_to(&self, path: &Path) -> std::io::Result<()>`
  - `LinuxConfig::load() -> Self`, `LinuxConfig::save(&self)` (Bequemlichkeit über `default_path`)

- [ ] **Step 1: Die failing Tests schreiben**

Create `src-tauri/src/overlay/mod.rs`:

```rust
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

impl LinuxConfig {
    pub fn default_path() -> Option<PathBuf> {
        let base = std::env::var_os("XDG_CONFIG_HOME")
            .map(PathBuf::from)
            .filter(|p| p.is_absolute())
            .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".config")))?;
        Some(base.join("com.flipclock.dev").join("linux.json"))
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
}
```

- [ ] **Step 2: Modul einhängen und Test laufen lassen — muss fehlschlagen**

`src-tauri/src/lib.rs` ganz oben ergänzen:

```rust
pub mod overlay;
```

Run: `cd src-tauri && cargo test overlay:: 2>&1 | tail -20`
Expected: FAIL — `cannot find module 'linux'`, weil `overlay/linux.rs` noch nicht existiert (nur unter Linux) bzw. bereits PASS auf Windows.

- [ ] **Step 3: Leeres Linux-Modul anlegen, damit der cfg-Zweig auflöst**

Create `src-tauri/src/overlay/linux.rs`:

```rust
//! Linux-spezifischer Teil des Overlays. Wird in Task 4 und 5 gefuellt.
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `cd src-tauri && cargo test overlay:: 2>&1 | tail -20`
Expected: PASS, 5 Tests.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/overlay/mod.rs src-tauri/src/overlay/linux.rs src-tauri/src/lib.rs
git commit -m "feat: rust-readable linux config (overlay mode, margins)"
```

---

### Task 4: Moduserkennung

**Files:**
- Modify: `src-tauri/src/overlay/mod.rs` (`detect_mode` + Tests)
- Modify: `src-tauri/src/overlay/linux.rs` (Wayland-Registry-Probe)
- Modify: `src-tauri/Cargo.toml` (`wayland-client`)

**Interfaces:**
- Consumes: `ModePreference`, `OverlayMode` aus Task 3
- Produces:
  - `pub fn detect_mode(pref: ModePreference, session_type: Option<&str>, layer_shell_available: bool) -> OverlayMode` — reine Funktion, keine IO
  - `pub fn detect_mode_from_env(pref: ModePreference) -> OverlayMode` — die IO-Hülle
  - `linux::layer_shell_available() -> bool`

- [ ] **Step 1: Die failing Tests schreiben**

In `src-tauri/src/overlay/mod.rs` ans Ende des `mod tests`-Blocks anfügen:

```rust
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
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `cd src-tauri && cargo test overlay:: 2>&1 | tail -20`
Expected: FAIL mit `cannot find function 'detect_mode' in this scope`

- [ ] **Step 3: `detect_mode` implementieren**

In `src-tauri/src/overlay/mod.rs` vor dem `#[cfg(test)]`-Block einfügen:

```rust
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
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `cd src-tauri && cargo test overlay:: 2>&1 | tail -20`
Expected: FAIL — `linux::layer_shell_available` existiert noch nicht. Auf Nicht-Linux: PASS, 12 Tests.

- [ ] **Step 5: `wayland-client` als Linux-Dependency ergänzen**

In `src-tauri/Cargo.toml` den Linux-Block erweitern:

```toml
[target.'cfg(target_os = "linux")'.dependencies]
gtk = { version = "0.18" }
wayland-client = "0.31"
```

- [ ] **Step 6: Registry-Probe implementieren**

`src-tauri/src/overlay/linux.rs` ersetzen:

```rust
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
```

- [ ] **Step 7: Tests laufen lassen — müssen bestehen**

Run: `cd src-tauri && cargo test overlay:: 2>&1 | tail -20`
Expected: PASS, 12 Tests.

- [ ] **Step 8: Probe gegen die echte Umgebung prüfen**

Einen temporären Test anlegen, der nur berichtet, was er sieht — er darf nicht Teil der Suite bleiben:

Run: `cd src-tauri && cargo test overlay::linux -- --ignored --nocapture` ist hier **nicht** anwendbar. Stattdessen einmalig prüfen:

```bash
cd src-tauri && cargo run --bin desktop-flipclock 2>&1 | head -5
```

Falls das die App startet, ist der Probe nicht isoliert prüfbar — dann stattdessen den Vergleichswert heranziehen:

```bash
wayland-info | grep zwlr_layer_shell_v1
```

Auf dem Entwicklungssystem (KDE Plasma 6.7.3, Wayland) muss dieser Aufruf `zwlr_layer_shell_v1` zeigen. Zeigt er es und die App wählt in Task 5 dennoch X11, liegt der Fehler im Probe.

- [ ] **Step 9: Commit**

```bash
git add src-tauri/src/overlay/mod.rs src-tauri/src/overlay/linux.rs src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "feat: detect overlay mode via wayland registry probe"
```

---

### Task 5: Overlay anwenden — die beiden Pfade

Ab hier läuft die App nach jedem Task.

**Files:**
- Modify: `src-tauri/src/overlay/linux.rs` (FFI + `apply` + `set_margin`)
- Modify: `src-tauri/build.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/tauri.conf.json`

**Interfaces:**
- Consumes: `OverlayMode`, `ModePreference`, `LinuxConfig`, `detect_mode_from_env` aus Task 3/4
- Produces:
  - `linux::apply(window: &tauri::WebviewWindow, mode: OverlayMode, margin_x: i32, margin_y: i32)`
  - `linux::set_margin(window: &tauri::WebviewWindow, margin_x: i32, margin_y: i32)`
  - `desktop_flipclock_lib::run(mode: OverlayMode)` — geänderte Signatur

- [ ] **Step 1: Build-Skript um das Link-Flag ergänzen**

`src-tauri/build.rs` ersetzen:

```rust
fn main() {
    #[cfg(target_os = "linux")]
    println!("cargo:rustc-link-lib=gtk-layer-shell");

    tauri_build::build()
}
```

Build-Abhängigkeit auf dem System: `gtk-layer-shell-devel` (Fedora) bzw. `libgtk-layer-shell-dev` (Debian/Ubuntu). Fehlt sie, bricht der Link mit `cannot find -lgtk-layer-shell`.

- [ ] **Step 2: FFI-Deklarationen ergänzen**

An `src-tauri/src/overlay/linux.rs` anfügen:

```rust
use std::os::raw::{c_int, c_void};

#[repr(C)]
#[allow(dead_code)]
enum Layer {
    Background = 0,
    Bottom = 1,
    Top = 2,
    Overlay = 3,
}

#[repr(C)]
#[allow(dead_code)]
enum Edge {
    Left = 0,
    Right = 1,
    Top = 2,
    Bottom = 3,
}

#[repr(C)]
#[allow(dead_code)]
enum KeyboardMode {
    None = 0,
    Exclusive = 1,
    OnDemand = 2,
}

// Direkte Bindung an die System-Bibliothek gtk-layer-shell (GTK3).
// Die Rust-Crate dafuer ist auf crates.io als UNMAINTAINED markiert.
extern "C" {
    fn gtk_layer_is_supported() -> c_int;
    fn gtk_layer_init_for_window(window: *mut c_void);
    fn gtk_layer_set_layer(window: *mut c_void, layer: Layer);
    fn gtk_layer_set_anchor(window: *mut c_void, edge: Edge, anchor_to_edge: c_int);
    fn gtk_layer_set_margin(window: *mut c_void, edge: Edge, margin_size: c_int);
    fn gtk_layer_set_keyboard_mode(window: *mut c_void, mode: KeyboardMode);
    fn gtk_layer_set_exclusive_zone(window: *mut c_void, exclusive_zone: c_int);
}

/// Rohzeiger auf das GtkWindow hinter einem Tauri-Fenster.
fn raw_gtk_window(window: &tauri::WebviewWindow) -> Option<*mut c_void> {
    use gtk::glib::translate::ToGlibPtr;
    use gtk::prelude::Cast;

    let gtk_win = window.gtk_window().ok()?;
    let ptr: *mut gtk::ffi::GtkWindow = gtk_win.upcast_ref::<gtk::Window>().to_glib_none().0;
    Some(ptr as *mut c_void)
}
```

- [ ] **Step 3: `apply` und `set_margin` implementieren**

An `src-tauri/src/overlay/linux.rs` anfügen:

```rust
use crate::overlay::OverlayMode;

/// Konfiguriert das Fenster fuer den gewaehlten Modus. Muss laufen, **bevor** das Fenster
/// realisiert wird — deshalb startet das Hauptfenster mit `"visible": false`.
pub fn apply(window: &tauri::WebviewWindow, mode: OverlayMode, margin_x: i32, margin_y: i32) {
    let Some(ptr) = raw_gtk_window(window) else {
        eprintln!("fliq: kein GtkWindow erreichbar, Overlay nicht konfiguriert");
        return;
    };

    match mode {
        OverlayMode::LayerShell => unsafe {
            if gtk_layer_is_supported() == 0 {
                // Praktisch unerreichbar, weil der Registry-Probe die Unterstuetzung bereits
                // festgestellt hat. Ein sichtbares Widget ohne Always-on-Top ist trotzdem
                // besser als ein unsichtbares.
                eprintln!("fliq: layer-shell laut GTK nicht unterstuetzt, nutze X11-Verhalten");
                apply_x11(window);
                return;
            }
            gtk_layer_init_for_window(ptr);
            gtk_layer_set_layer(ptr, Layer::Overlay);
            gtk_layer_set_keyboard_mode(ptr, KeyboardMode::None);
            // -1 heisst: fremde exclusive zones ignorieren. Sonst verschoebe ein
            // erscheinendes Panel das Widget.
            gtk_layer_set_exclusive_zone(ptr, -1);
            gtk_layer_set_anchor(ptr, Edge::Top, 1);
            gtk_layer_set_anchor(ptr, Edge::Left, 1);
            gtk_layer_set_margin(ptr, Edge::Top, margin_y);
            gtk_layer_set_margin(ptr, Edge::Left, margin_x);
        },
        OverlayMode::X11 => apply_x11(window),
    }
}

fn apply_x11(window: &tauri::WebviewWindow) {
    use gtk::prelude::GtkWindowExt;

    let Ok(gtk_win) = window.gtk_window() else { return };
    gtk_win.set_keep_above(true);
    gtk_win.set_skip_taskbar_hint(true);
    gtk_win.set_skip_pager_hint(true);
    // Bewusst KEIN WindowTypeHint::Dock: Dock-Fenster lassen sich vom WM nicht ziehen,
    // und `startDragging` ist auf diesem Pfad die Bedienung.
}

/// Verschiebt ein bereits konfiguriertes Layer-Surface. Auf dem X11-Pfad wirkungslos —
/// dort positioniert `startDragging` das Fenster.
pub fn set_margin(window: &tauri::WebviewWindow, margin_x: i32, margin_y: i32) {
    let Some(ptr) = raw_gtk_window(window) else { return };
    unsafe {
        gtk_layer_set_margin(ptr, Edge::Top, margin_y);
        gtk_layer_set_margin(ptr, Edge::Left, margin_x);
    }
}
```

- [ ] **Step 4: Hauptfenster unsichtbar starten lassen**

In `src-tauri/tauri.conf.json` im Objekt unter `app.windows[0]` ergänzen — direkt nach `"decorations": false`:

```json
        "visible": false,
```

Das ist der Kern: GTK realisiert das Fenster erst bei `show()`, und nur davor lässt sich Layer-Shell initialisieren.

- [ ] **Step 5: Moduswahl in `main.rs` vor GTK-Init**

`src-tauri/src/main.rs` ersetzen:

```rust
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use desktop_flipclock_lib::overlay::{self, OverlayMode};

fn main() {
    let config = overlay::LinuxConfig::load();
    let mode = overlay::detect_mode_from_env(config.overlay_mode);

    // MUSS vor jeder GTK-Initialisierung passieren — Tauri initialisiert GTK erst in `run`.
    // Edition 2021: `set_var` ist hier noch sicher aufrufbar.
    #[cfg(target_os = "linux")]
    if mode == OverlayMode::X11 {
        std::env::set_var("GDK_BACKEND", "x11");
    }

    desktop_flipclock_lib::run(mode, config);
}
```

- [ ] **Step 6: `run` erweitern und Overlay in `setup()` anwenden**

In `src-tauri/src/lib.rs` die Funktion `run` ersetzen:

```rust
// Main Window
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(mode: overlay::OverlayMode, config: overlay::LinuxConfig) {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--flag1", "--flag2"])))
        .plugin(tauri_plugin_shell::init())
        .manage(OverlayState { mode, config: std::sync::Mutex::new(config.clone()) })
        .setup(move |app| {
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "linux")]
                overlay::linux::apply(&window, mode, config.margin_x, config.margin_y);

                window.show()?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![open_stylingmenu_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Und oberhalb von `run` den geteilten Zustand ergänzen:

```rust
pub mod overlay;

/// Gewaehlter Modus und persistierte Werte, erreichbar aus den Commands.
pub struct OverlayState {
    pub mode: overlay::OverlayMode,
    pub config: std::sync::Mutex<overlay::LinuxConfig>,
}
```

Der bereits vorhandene `pub mod overlay;` aus Task 3 darf nicht doppelt stehen.

- [ ] **Step 7: Bauen und starten**

Run: `npm run tauri dev`
Expected: Fenster erscheint. In der Konsole darf keine `layer-shell laut GTK nicht unterstuetzt`-Meldung stehen.

- [ ] **Step 8: Auf KDE Wayland manuell verifizieren**

1. Fenster ist rahmenlos und transparent
2. Ein normales Fenster (Dateimanager) darüberlegen → Uhr bleibt sichtbar
3. Ein Video oder Spiel im **Vollbild** starten → Uhr bleibt sichtbar. **Das ist der Kern des ganzen Vorhabens.**
4. Alt-Tab → Uhr taucht nicht auf
5. In die Uhr klicken → der Fokus des darunterliegenden Fensters bleibt erhalten

Punkt 3 schlägt fehl → `gtk_layer_set_layer` prüfen, es muss `Layer::Overlay` sein, nicht `Top`.

- [ ] **Step 9: Auf X11 gegenprüfen**

Eine X11-Session starten (in SDDM bei der Anmeldung "Plasma (X11)" wählen), App starten. Erwartung: Fenster erscheint, liegt über normalen Fenstern, taucht nicht in der Taskbar auf, **und lässt sich ziehen**. Über Fullscreen liegt es hier nicht — das ist erwartet.

- [ ] **Step 10: Commit**

```bash
git add src-tauri/src/overlay/linux.rs src-tauri/build.rs src-tauri/src/main.rs src-tauri/src/lib.rs src-tauri/tauri.conf.json
git commit -m "feat: apply layer-shell or x11 overlay mode at startup"
```

---

### Task 6: Ziehen im Layer-Shell-Modus

**Files:**
- Modify: `src-tauri/src/lib.rs` (drei Commands)
- Modify: `src-tauri/capabilities/main-capability.json`
- Modify: `src/pages/App.tsx:85-116`

**Interfaces:**
- Consumes: `OverlayState` aus Task 5, `linux::set_margin`
- Produces:
  - Command `get_overlay_state() -> OverlayInfo { mode: String, margin_x: i32, margin_y: i32 }`
  - Command `set_overlay_margin(x: i32, y: i32, persist: bool)`
  - Command `set_overlay_mode(mode: String)` (von Task 7 benutzt)

- [ ] **Step 1: Commands implementieren**

In `src-tauri/src/lib.rs` vor `run` einfügen:

```rust
#[derive(serde::Serialize)]
pub struct OverlayInfo {
    pub mode: String,
    pub margin_x: i32,
    pub margin_y: i32,
}

#[tauri::command]
fn get_overlay_state(state: tauri::State<'_, OverlayState>) -> OverlayInfo {
    let cfg = state.config.lock().unwrap();
    OverlayInfo {
        #[cfg(target_os = "linux")]
        mode: state.mode.as_str().to_string(),
        #[cfg(not(target_os = "linux"))]
        mode: "native".to_string(),
        margin_x: cfg.margin_x,
        margin_y: cfg.margin_y,
    }
}

/// Waehrend des Ziehens mit `persist: false` — sonst gaebe es einen Datei-Write pro
/// Mausbewegung. Beim Loslassen einmal mit `persist: true`.
#[tauri::command]
fn set_overlay_margin(
    _window: tauri::WebviewWindow,
    state: tauri::State<'_, OverlayState>,
    x: i32,
    y: i32,
    persist: bool,
) {
    {
        let mut cfg = state.config.lock().unwrap();
        cfg.margin_x = x;
        cfg.margin_y = y;
        if persist {
            if let Err(e) = cfg.save() {
                eprintln!("fliq: konnte linux.json nicht schreiben: {e}");
            }
        }
    }

    #[cfg(target_os = "linux")]
    if state.mode == overlay::OverlayMode::LayerShell {
        overlay::linux::set_margin(&_window, x, y);
    }
}

/// Wirkt erst nach einem Neustart — das GDK-Backend steht beim Start fest.
#[tauri::command]
fn set_overlay_mode(state: tauri::State<'_, OverlayState>, mode: String) -> Result<(), String> {
    let pref = match mode.as_str() {
        "auto" => overlay::ModePreference::Auto,
        "layer-shell" => overlay::ModePreference::LayerShell,
        "x11" => overlay::ModePreference::X11,
        other => return Err(format!("unbekannter Overlay-Modus: {other}")),
    };
    let mut cfg = state.config.lock().unwrap();
    cfg.overlay_mode = pref;
    cfg.save().map_err(|e| e.to_string())
}
```

`OverlayMode` braucht dafür `PartialEq` — das ist in Task 3 bereits abgeleitet.

- [ ] **Step 2: Commands registrieren**

In `src-tauri/src/lib.rs` den `invoke_handler`-Aufruf ersetzen:

```rust
        .invoke_handler(tauri::generate_handler![
            open_stylingmenu_window,
            get_overlay_state,
            set_overlay_margin,
            set_overlay_mode
        ])
```

- [ ] **Step 3: Bauen**

Run: `cd src-tauri && cargo check 2>&1 | tail -20`
Expected: Kompiliert ohne Fehler.

- [ ] **Step 4: Drag-Weiche im Frontend**

In `src/pages/App.tsx` den `useEffect`-Block der Zeilen 85-116 ersetzen:

```tsx
  useEffect(() => {

    //initialise Event Listeners

    //Save Window Position on unload
    const handleBeforeUnload = () => {
      saveWindowState(StateFlags.POSITION);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Im Layer-Shell-Modus positioniert der Compositor das Fenster; startDragging gibt es
    // dort nicht. Der Drag wird deshalb in Anker-Margins uebersetzt.
    let mode = "native";
    let margin = { x: 0, y: 0 };

    invoke<{ mode: string; margin_x: number; margin_y: number }>("get_overlay_state")
      .then((s) => { mode = s.mode; margin = { x: s.margin_x, y: s.margin_y }; })
      .catch(() => { /* aeltere Builds ohne den Command */ });

    function handleMouseDown(e: any) {
      if (e.button !== 0) return;

      if (mode !== "layer-shell") {
        getCurrentWindow().startDragging();
        return;
      }

      const startX = e.screenX;
      const startY = e.screenY;
      const base = { ...margin };

      const onMove = (ev: PointerEvent) => {
        margin = {
          x: Math.max(0, base.x + (ev.screenX - startX)),
          y: Math.max(0, base.y + (ev.screenY - startY)),
        };
        invoke("set_overlay_margin", { x: margin.x, y: margin.y, persist: false });
      };

      const onUp = () => {
        invoke("set_overlay_margin", { x: margin.x, y: margin.y, persist: true });
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    }

    const div = document.getElementById('maindiv');
    if(div)
    {
      div.addEventListener("mousedown", handleMouseDown);
    }

    return () => {
      // Clean up the event listener
      if(div)
      {
        div.removeEventListener("mousedown", handleMouseDown);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveWindowState(StateFlags.POSITION);
    };
  }, []);
```

- [ ] **Step 5: Verifizieren**

Run: `npm run tauri dev`

1. Uhr anfassen und ziehen — sie folgt der Maus
2. Loslassen, App beenden, neu starten — die Uhr steht an derselben Stelle
3. `cat ~/.config/com.flipclock.dev/linux.json` — `margin_x`/`margin_y` entsprechen der Position
4. Ein Panel ein-/ausblenden (KDE-Systemeinstellungen) — die Uhr springt nicht

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/lib.rs src/pages/App.tsx
git commit -m "feat: drag support for layer-shell mode via anchor margins"
```

---

### Task 7: Overlay-Modus im Settings-Menü

**Files:**
- Modify: `src/pages/StylingMenu.tsx:183-243`

**Interfaces:**
- Consumes: Commands `get_overlay_state`, `set_overlay_mode` aus Task 6
- Produces: keine neuen Schnittstellen

- [ ] **Step 1: Imports und Zustand ergänzen**

In `src/pages/StylingMenu.tsx` bei den bestehenden Imports ergänzen:

```tsx
import { invoke } from "@tauri-apps/api/core";
```

Und innerhalb der Komponente, bei den übrigen `useState`-Deklarationen:

```tsx
  // Overlay-Modus: nur unter Linux relevant. "native" heisst Windows/macOS.
  const [platformMode, setPlatformMode] = useState<string>("native");
  const [overlayPref, setOverlayPref] = useState<string>("auto");

  useEffect(() => {
    invoke<{ mode: string }>("get_overlay_state")
      .then((s) => setPlatformMode(s.mode))
      .catch(() => setPlatformMode("native"));
  }, []);
```

- [ ] **Step 2: Dropdown in die General-Settings-Karte einsetzen**

In `src/pages/StylingMenu.tsx` direkt vor dem schließenden `</Card>` der General-Settings-Karte (Zeile 243) einfügen:

```tsx
              {platformMode !== "native" && (
                <>
                  <Space h="xs" />
                  <Group grow mt={"md"}>
                    <Select
                      label="Overlay Mode (Linux)"
                      description="Layer-Shell stays above fullscreen windows but needs KDE, Sway or Hyprland. X11 Compatibility works everywhere. Takes effect after a restart."
                      value={overlayPref}
                      onChange={(value) => {
                        if (!value) return;
                        setOverlayPref(value);
                        invoke("set_overlay_mode", { mode: value });
                      }}
                      data={[
                        { value: "auto", label: "Auto (recommended)" },
                        { value: "layer-shell", label: "Layer-Shell" },
                        { value: "x11", label: "X11 Compatibility" },
                      ]}
                      labelProps={{ style: { marginBottom: 12 } }}
                    />
                  </Group>
                </>
              )}
```

- [ ] **Step 3: Verifizieren**

Run: `npm run tauri dev`

1. Settings öffnen → Dropdown "Overlay Mode (Linux)" ist in "General Settings" sichtbar
2. Auf "X11 Compatibility" stellen, App neu starten
3. `cat ~/.config/com.flipclock.dev/linux.json` → `"overlay_mode": "x11"`
4. Uhr liegt jetzt **nicht** mehr über Fullscreen, lässt sich aber weiterhin ziehen
5. Zurück auf "Auto", neu starten → Verhalten aus Task 5 ist wieder da

- [ ] **Step 4: Commit**

```bash
git add src/pages/StylingMenu.tsx
git commit -m "feat: overlay mode selector in styling menu"
```

---

### Task 8: CI, Packaging und README

**Files:**
- Create: `.github/workflows/release.yml`
- Modify: `src-tauri/tauri.conf.json` (Linux-Bundle-Dependencies)
- Modify: `README.md`

**Interfaces:**
- Consumes: alles Vorige
- Produces: `.deb`, `.rpm`, AppImage und Windows-Setup als Release-Artefakte

- [ ] **Step 1: Laufzeit-Abhängigkeit im Bundle deklarieren**

In `src-tauri/tauri.conf.json` im `bundle`-Objekt ergänzen, neben dem bestehenden `windows`-Schlüssel:

```json
    "linux": {
      "deb": {
        "depends": ["libgtk-layer-shell0"]
      },
      "rpm": {
        "depends": ["gtk-layer-shell"]
      }
    },
```

- [ ] **Step 2: Release-Workflow anlegen**

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - "v*"
  workflow_dispatch:

jobs:
  build:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          # 22.04 statt 24.04: baut gegen aeltere glibc/WebKit, laeuft dadurch auch auf
          # neueren Systemen. Andersherum nicht.
          - platform: ubuntu-22.04
            args: ""
          - platform: windows-latest
            args: ""

    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      - name: Install Linux dependencies
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            libgtk-3-dev \
            libgtk-layer-shell-dev \
            libayatana-appindicator3-dev \
            librsvg2-dev \
            patchelf

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - uses: dtolnay/rust-toolchain@stable

      - uses: swatinem/rust-cache@v2
        with:
          workspaces: "./src-tauri -> target"

      - name: Install frontend dependencies
        run: npm ci

      - name: Run Rust tests
        run: cargo test --manifest-path src-tauri/Cargo.toml

      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: "Fliq ${{ github.ref_name }}"
          releaseDraft: true
          prerelease: false
          args: ${{ matrix.args }}
```

- [ ] **Step 3: Workflow ohne Tag testen**

Push auf den Branch, dann in GitHub unter *Actions* → *Release* → *Run workflow* manuell auslösen.

Expected: Beide Jobs laufen durch. Der Linux-Job muss `.deb`, `.rpm` und AppImage erzeugen, der Windows-Job das NSIS-Setup. Bricht der Linux-Job mit `cannot find -lgtk-layer-shell`, fehlt `libgtk-layer-shell-dev` in Step "Install Linux dependencies".

- [ ] **Step 4: Erzeugtes Paket lokal installieren und starten**

```bash
sudo dnf install ./src-tauri/target/release/bundle/rpm/*.rpm
```

Expected: Installation ohne fehlende Abhängigkeiten, App startet aus dem Anwendungsmenü, Verhalten wie in Task 5 Step 8.

- [ ] **Step 5: README um den Linux-Abschnitt erweitern**

In `README.md` nach dem Windows-Block unter "Installation 💻" einfügen:

````markdown
### Linux 🐧

Download the latest package from the [Releases](https://github.com/Dav1d-Fn/Fliq-Desktop-Flipclock/releases) page:

- **Fedora / openSUSE:** `.rpm`
- **Debian / Ubuntu / Mint:** `.deb`
- **Anything else:** `.AppImage` — make it executable and run it

#### What works where

Wayland does not let an application keep itself on top by itself. Fliq therefore picks one
of two modes at startup, and what you get depends on your desktop:

| Desktop | Frameless & transparent | Above normal windows | Above fullscreen games |
|---|---|---|---|
| KDE Plasma (Wayland) | ✅ | ✅ | ✅ |
| Sway / Hyprland | ✅ | ✅ | ✅ |
| GNOME (Wayland) | ✅ | ✅ | ❌ |
| Any X11 session | ✅ | ✅ | ❌ |

Above fullscreen requires the `wlr-layer-shell` protocol, which GNOME does not implement.
If auto-detection picks the wrong mode, override it under **Styling → General Settings →
Overlay Mode**.

#### Building from source

```bash
# Fedora
sudo dnf install webkit2gtk4.1-devel gtk3-devel gtk-layer-shell-devel libappindicator-gtk3-devel librsvg2-devel

# Debian / Ubuntu
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libgtk-layer-shell-dev libayatana-appindicator3-dev librsvg2-dev

npm install
npm run tauri build
```
````

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/release.yml src-tauri/tauri.conf.json README.md
git commit -m "ci: build and release linux and windows artifacts"
```

---

### Task 9: Abschlussverifikation

Kein Code. Die Checkliste aus der Spec, einmal vollständig.

**Files:** keine

- [ ] **Step 1: KDE Wayland**

| Prüfung | ok? |
|---|---|
| Fenster rahmenlos und transparent | |
| Über normalen Fenstern | |
| Über Fullscreen-Fenster | |
| Nicht in Taskbar / Alt-Tab | |
| Nimmt keinen Fokus | |
| Ziehen funktioniert, Position überlebt Neustart | |
| Rechtsklickmenü an der Mausposition | |
| Settings-Änderung erreicht die Uhr sofort | |
| Autostart greift nach Reboot | |

- [ ] **Step 2: KDE X11**

Dieselbe Tabelle, ohne die Zeile "Über Fullscreen-Fenster".

- [ ] **Step 3: GNOME in einer VM**

Dieselbe Tabelle, ohne die Zeile "Über Fullscreen-Fenster". Nicht auf der Hauptmaschine — eine zweite Desktop-Umgebung parallel zu installieren zieht Konflikte nach sich, die nichts mit diesem Projekt zu tun haben.

- [ ] **Step 4: Windows**

Dieselbe Tabelle, ohne die Zeile "Über Fullscreen-Fenster", durch den Autor auf seinem Windows-System. Zusätzlich: das Overlay-Dropdown darf im Settings-Menü **nicht** erscheinen.

- [ ] **Step 5: Branch mergen**

Erst wenn alle vier Tabellen sauber sind. Siehe superpowers:finishing-a-development-branch.

---

## Self-Review

**Spec-Abdeckung:**

| Spec-Abschnitt | Task |
|---|---|
| Modus A — Layer-Shell | 5 |
| Modus B — XWayland/X11 | 5 |
| Moduserkennung (Registry-Probe) | 4 |
| Manueller Override | 6 (Command), 7 (UI) |
| Rust-lesbare Einstellungen (`linux.json`) | 3 |
| `main.rs` — Moduswahl vor GTK-Init | 5 |
| `overlay.rs` — Modul | 3, 4, 5 |
| `lib.rs` — Commands | 5, 6 |
| `tauri.conf.json` — `visible: false` | 5 |
| `App.tsx` — Drag-Weiche | 6 |
| `StylingMenu.tsx` — Dropdown | 7 |
| Datenfluss Positionierung | 6 |
| Fehlerbehandlung `gtk_layer_is_supported` | 5 |
| Fehlerbehandlung Socket / Override | 4 (`detect_mode`-Tests) |
| Unit-Tests `detect_mode`, `LinuxConfig` | 3, 4 |
| Manuelle Checkliste | 9 |
| Windows-Regressionstest | 1 (Step 14), 9 (Step 4) |
| CI & Packaging | 8 |
| README | 8 |
| Offener Messpunkt Settings-Sync | 2 |
| Tauri-Upgrade | 1 |

Keine Lücken.

**Abweichungen von der Spec, bewusst:**

1. **Type-Hint `Dock` entfällt.** Die Spec nennt ihn für Modus B. Dock-Fenster lassen sich von den meisten WMs nicht per `begin_move_drag` ziehen, und Ziehen ist auf diesem Pfad die Bedienung. `keep_above` + `skip_taskbar` + `skip_pager` liefern das gewünschte Verhalten ohne diesen Nebeneffekt. Die Spec ist entsprechend zu korrigieren.
2. **`overlay.rs` wird zu `overlay/mod.rs` + `overlay/linux.rs`.** Die Spec nennt eine Datei. Die Trennung ist nötig, damit die reine Logik auf allen Plattformen kompiliert und die Tests auch im Windows-CI-Job laufen.
3. **`gtk_layer_set_exclusive_zone(-1)` kommt hinzu.** In der Spec nicht erwähnt. Ohne den Aufruf werden Margins ab der Kante einer fremden exclusive zone gemessen, und das Widget springt, sobald ein Panel erscheint.
4. **`Webview.getByLabel` und das `.unwrap()` in `open_stylingmenu_window`** werden in Task 1 mitrepariert. Nicht in der Spec, aber der Sync→Async-Wechsel gehört zur Migration, und ein panisches Settings-Fenster blockiert die Testcheckliste in Task 9.

**Platzhalter-Scan:** keine TBD/TODO, jeder Code-Schritt enthält den vollständigen Code.

**Typkonsistenz:** `ModePreference`/`OverlayMode`/`LinuxConfig` aus Task 3 werden in 4, 5 und 6 unverändert verwendet. Mode-Strings `"layer-shell"`/`"x11"`/`"native"` stimmen zwischen `OverlayMode::as_str` (Task 3), `get_overlay_state` (Task 6), `App.tsx` (Task 6) und `StylingMenu.tsx` (Task 7) überein. Die Preference-Strings `"auto"`/`"layer-shell"`/`"x11"` in `set_overlay_mode` (Task 6) decken sich mit den Dropdown-Werten (Task 7) und mit `#[serde(rename_all = "kebab-case")]` (Task 3).
