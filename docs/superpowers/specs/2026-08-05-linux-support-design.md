# Fliq – Linux-Support (KDE/Wayland, GNOME, X11)

**Datum:** 2026-08-05
**Status:** Design freigegeben, Implementierungsplan ausstehend

## Problem

Fliq ist ein rahmenloses, transparentes Desktop-Widget, das immer im Vordergrund liegt.
Unter Windows funktioniert das. Unter Linux nicht.

Ursache: Der Entwickler-Desktop ist KDE Plasma 6.7.3 auf **Wayland**. Unter Wayland kann
sich eine normale Anwendung nicht selbst in den Vordergrund halten — das Protokoll sieht
es nicht vor. Sämtliche X11-Mechanismen (`_NET_WM_STATE_ABOVE`, GTK-Window-Type-Hints,
`set_keep_above`) sind dort stille No-Ops. Der bestehende Fix-Versuch im Arbeitsbaum
(`set_type_hint(Utility)` in `setup()`) konnte deshalb nicht wirken, und zusätzlich zu
spät: GTK wertet den Type-Hint beim Realize aus, in Tauris `setup()` ist das Fenster
bereits realisiert.

## Ziele

1. Fliq läuft auf KDE, GNOME, XFCE und Cinnamon — jeweils Wayland wie X11 — rahmenlos,
   transparent und über normalen Fenstern.
2. Auf Compositors mit `zwlr_layer_shell_v1` (KDE, Sway, Hyprland, wlroots-basierte)
   liegt Fliq zusätzlich **über Fullscreen-Fenstern**, also auch über Spielen.
3. Die Bedienung bleibt identisch zu Windows: anfassen, ziehen, Rechtsklick-Menü.
4. Installation über native Pakete (`.deb`, `.rpm`) oder AppImage.
5. Windows-Support bleibt unverändert funktionsfähig.

## Nicht-Ziele

- **Over-Fullscreen auf GNOME.** Mutter unterstützt `wlr-layer-shell` nicht und wird es
  absehbar nicht tun. Der einzige Weg wäre eine GNOME-Shell-Extension — eigenes Projekt,
  eigener Review-Prozess, eigener Wartungsaufwand.
- **Flatpak/Flathub.** Die Sandbox verlangt das Background-Portal für Autostart und
  expliziten Wayland-Socket-Zugriff für Layer-Shell. Sinnvoll als eigener zweiter Schritt.
- **macOS.** Der Linux-Code steht vollständig hinter `#[cfg(target_os = "linux")]` und
  stört dort nicht, aber Distribution ohne Apple-Developer-Account scheitert an Gatekeeper,
  und Always-on-Top über Fullscreen wäre dort eine eigene Baustelle (`NSWindow`-Level).
  Die CI-Matrix lässt sich später um `macos-latest` erweitern.

## Ausgangslage

Aktuell im Arbeitsbaum, nicht committet:

| Datei | Änderung | Bewertung |
|---|---|---|
| `src-tauri/Cargo.toml` | `gtk 0.18` als Linux-Dependency | bleibt, wird gebraucht |
| `src-tauri/src/lib.rs` | `set_type_hint(Utility)` in `.setup()` | wirkungslos, wird ersetzt |
| `src-tauri/src/lib.rs` | toter `greet`-Handler entfernt | korrekt — bei zwei `invoke_handler`-Aufrufen überschreibt der zweite den ersten |
| `src/styles/styles.css` | `background: transparent` auf html/body | korrekt und nötig, WebKitGTK reicht das nicht durch wie WebView2 |
| `src/pages/App.tsx` | `await` vor `startDragging()` entfernt | korrekt — GTKs `begin_move_drag` braucht das laufende Event |
| `src/pages/App.tsx` | Menü-Position `clientX` → `screenX * dpr` | ungeprüfter Workaround, wird zurückgebaut und neu vermessen |
| `src/pages/App.tsx` | `preventDefault`/`stopPropagation` im Contextmenu | bleibt, verhindert WebKitGTKs Eigenmenü |
| `src/pages/atoms.ts` | ~165 Zeilen Cross-Window-localStorage-Sync | echtes Symptom, Ursache unvermessen — siehe unten |

Umgebung (verifiziert):

- KDE Plasma 6.7.3, `XDG_SESSION_TYPE=wayland`
- KWin bietet `zwlr_layer_shell_v1` **Version 5** an → Layer-Shell-Pfad ist real verfügbar
- System-Bibliothek `gtk-layer-shell 0.10.0` installiert (GTK3, passend zu Tauri)
- Rust-Crate `gtk-layer-shell 0.8.2` ist auf crates.io als **UNMAINTAINED** markiert
- Projekt hängt auf `tauri 2.0.0-beta.19` / `wry 0.39.5`; aktuell ist `tauri 2.11.5`
- Toolchain vorhanden: rustc 1.93.1, Node 22.23.1, webkit2gtk-4.1 2.52.5

## Architektur

Ein Binary, zwei Betriebsmodi. Der Modus wird beim Start einmalig bestimmt; danach gibt
es im laufenden Betrieb keine Verzweigung mehr.

### Modus A — Layer-Shell

Zielsysteme: KDE, Sway, Hyprland, alle wlroots-basierten Compositors.

Das GTK-Fenster wird **vor dem Realize** zu einem Layer-Surface gemacht:

- Layer `OVERLAY` — derselbe Layer wie Panels und OSDs, liegt über Fullscreen-Fenstern
- Keyboard-Mode `NONE` — das Widget nimmt nie Fokus
- Exclusive-Zone `-1` — fremde exclusive zones werden ignoriert, sonst würde ein
  erscheinendes Panel das Widget verschieben
- Anker `TOP | LEFT`, Position über Margins

### Modus B — XWayland / X11

Zielsysteme: GNOME, XFCE, Cinnamon, echte X11-Sessions.

`GDK_BACKEND=x11` wird gesetzt, bevor GTK initialisiert. Danach greifen die klassischen
Mechanismen: `set_keep_above(true)`, `set_skip_taskbar_hint(true)`, `set_skip_pager_hint(true)`.
Ergebnis: über normalen Fenstern, **nicht** über Fullscreen-Spielen. Das ist die
dokumentierte Grenze des Modus, kein Bug.

Bewusst **kein** Window-Type-Hint `Dock`: Dock-Fenster lassen sich von den meisten
Window-Managern nicht per `begin_move_drag` verschieben, und Ziehen ist auf diesem Pfad
die Bedienung. `keep_above` liefert dasselbe Ergebnis ohne diesen Nebeneffekt.

### Moduserkennung

In `main()`, vor jeder GTK-Initialisierung:

1. Ist `XDG_SESSION_TYPE != wayland` → Modus B.
2. Sonst: kurze Verbindung zum Wayland-Socket, Registry aufzählen, auf
   `zwlr_layer_shell_v1` prüfen. Vorhanden → Modus A, sonst → Modus B.

Der Registry-Probe kostet die Crate `wayland-client` (klein, gepflegt, rein Rust) und
läuft ohne GTK-Initialisierung — damit bleibt die Backend-Wahl frei. Er ist einer
Heuristik über `XDG_CURRENT_DESKTOP` vorzuziehen, weil er auch auf niri, Wayfire, labwc
oder COSMIC korrekt entscheidet, statt gegen eine Liste zu raten.

Für Modus B setzt `main()` anschließend `std::env::set_var("GDK_BACKEND", "x11")`.
Das Projekt ist Edition 2021, dort ist `set_var` noch sicher aufrufbar.

### Manueller Override

Im Settings-Menü ein Dropdown **Overlay-Modus: Auto / Layer-Shell / X11-Kompatibilität**
mit Neustart-Hinweis.

Begründung: Auto-Erkennung wird auf irgendeiner Distro falsch liegen. Der Override ist
die Notausgangstür für Setups, an die wir nicht gedacht haben, und erspart Bug-Reports,
die nicht reproduzierbar sind.

### Rust-lesbare Einstellungen

Overlay-Modus und Margins können **nicht** wie die übrigen Settings im `localStorage`
liegen: `main()` und `setup()` brauchen beide Werte, bevor überhaupt ein Webview
existiert, und Rust kann `localStorage` zu diesem Zeitpunkt nicht lesen.

Deshalb eine eigene kleine Datei im App-Config-Verzeichnis
(`~/.config/com.flipclock.dev/linux.json`):

```json
{ "overlay_mode": "auto", "margin_x": 40, "margin_y": 40 }
```

Gelesen von `main()` und `overlay::apply` per `serde_json`, geschrieben über die Commands
`set_overlay_margin` und `set_overlay_mode`. Fehlt oder ist sie kaputt, gelten die
Defaults (`auto`, 40/40) und die Datei wird beim nächsten Schreiben neu angelegt.

Das ist bewusst eine Datei und keine zusätzliche Plugin-Abhängigkeit — es sind drei Werte
und rund zehn Zeilen `serde_json`. Alle übrigen Settings bleiben unverändert im
`localStorage`, weil sie nur das Frontend betreffen.

## Komponenten

### `src-tauri/src/main.rs`

Neue Verantwortung: Moduswahl vor GTK-Init. Liest `linux.json`, führt bei `auto` die
Erkennung durch, setzt ggf. `GDK_BACKEND`, reicht den ermittelten Modus an `lib.rs` weiter.

### `src-tauri/src/overlay/` (neu)

Gekapselt, damit `lib.rs` nicht zur Sammelstelle wird. Zwei Dateien, damit die reine Logik
auf allen Plattformen kompiliert und ihre Tests auch im Windows-CI-Job laufen:
`mod.rs` (Typen, Config, `detect_mode`) und `linux.rs` (FFI, Compositor-Probe, `apply`),
letztere komplett `#[cfg(target_os = "linux")]`. Enthält:

- `enum OverlayMode { LayerShell, X11 }`
- `struct LinuxConfig { overlay_mode, margin_x, margin_y }` mit `load()` / `save()`
- `detect_mode(override: Option<OverlayMode>) -> OverlayMode` — der Registry-Probe
- `apply(window: &tauri::WebviewWindow, mode: OverlayMode, margin: (i32, i32))` — die Weiche
- die `extern "C"`-Deklarationen für gtk-layer-shell

Verwendete C-Funktionen: `gtk_layer_init_for_window`, `gtk_layer_set_layer`,
`gtk_layer_set_anchor`, `gtk_layer_set_margin`, `gtk_layer_set_keyboard_mode`,
`gtk_layer_set_exclusive_zone`, `gtk_layer_is_supported`. Rund 15 Zeilen `extern "C"` plus
`println!("cargo:rustc-link-lib=gtk-layer-shell")` in der `build.rs` — statt einer als
unmaintained markierten Crate in ein Projekt zu ziehen, das noch Jahre laufen soll.

Schnittstelle nach außen: `OverlayMode`, `detect_mode`, `apply`, `set_margin`.
Abhängigkeiten: `tauri`, `gtk`, `wayland-client`, die System-Lib `gtk-layer-shell`.

### `src-tauri/src/lib.rs`

Bleibt schlank. In `setup()` genau ein Aufruf `overlay::apply(...)`, danach
`window.show()`. Zwei neue Commands:

- `set_overlay_margin(x: i32, y: i32)` — verschiebt das Layer-Surface und schreibt `linux.json`
- `set_overlay_mode(mode: String)` — schreibt den Override nach `linux.json`, wirkt ab Neustart
- `get_overlay_mode() -> String` — damit das Frontend weiß, welcher Drag-Pfad gilt

### `src-tauri/tauri.conf.json`

Hauptfenster bekommt `"visible": false`. Das ist der Kern der Lösung: GTK realisiert das
Fenster erst bei `show()`, und nur so lässt sich Layer-Shell überhaupt initialisieren.
`decorations: false`, `transparent: true`, `shadow: false` bleiben.

Neue Linux-Bundle-Dependencies für `.deb`/`.rpm`: `libgtk-layer-shell0` bzw.
`gtk-layer-shell`.

### `src/pages/App.tsx`

Beim Mount einmal `get_overlay_mode()` abfragen und den Drag-Handler entsprechend wählen:

- **Modus B / Windows:** `getCurrentWindow().startDragging()` wie bisher, ohne `await`
- **Modus A:** `pointerdown` → `setPointerCapture`, `pointermove` → Delta aufsummieren und
  `set_overlay_margin` aufrufen, `pointerup` → Margin als Setting persistieren

Das Kontextmenü wird auf `clientX`/`clientY` zurückgebaut und nach dem Tauri-Upgrade neu
vermessen.

### `src/pages/StylingMenu.tsx`

Ein Dropdown für den Overlay-Modus, sichtbar nur unter Linux, mit Neustart-Hinweis.

## Datenfluss

**Positionierung, Modus A:** Pointer-Delta im Webview → `set_overlay_margin` →
`gtk_layer_set_margin` → Compositor. Beim Loslassen wird der Wert nach `linux.json`
geschrieben und beim nächsten Start in `overlay::apply` wieder gesetzt. Während des Ziehens
wird nur die Margin gesetzt, nicht geschrieben — sonst gäbe es einen Datei-Write pro
Mausbewegung.

**Positionierung, Modus B:** unverändert über `startDragging` und
`tauri-plugin-window-state`.

`tauri-plugin-window-state` bleibt für Modus B und Windows zuständig. In Modus A ist eine
Fensterposition bedeutungslos — dort sind die Margins aus `linux.json` die Wahrheit, und
das Plugin wird für das Hauptfenster übersprungen.

**Settings-Sync zwischen den Fenstern:** siehe offener Messpunkt unten.

## Fehlerbehandlung

- **`gtk_layer_is_supported()` ist in Modus A `false`:** Warnung loggen, auf
  Modus-B-Verhalten zurückfallen, Fenster trotzdem anzeigen. Praktisch unerreichbar, weil
  der Registry-Probe die Unterstützung bereits festgestellt hat — aber ein sichtbares
  Widget ohne Always-on-Top ist besser als ein unsichtbares. Bewusst **kein** Re-exec mit
  anderem Backend; der Aufwand lohnt für einen Fall nicht, der nicht eintreten kann.
- **Wayland-Socket nicht erreichbar** trotz `XDG_SESSION_TYPE=wayland`: → Modus B.
- **`show()` schlägt fehl:** Fehler propagieren, Start abbrechen. Ein unsichtbares Widget
  ohne Fehlermeldung wäre der schlechtere Ausgang.
- **Manueller Override auf Layer-Shell in einer X11-Session:** Warnung loggen, Modus B
  erzwingen.

## Verifikation

Automatisiert testbar ist hier wenig — der Kern ist Compositor-Verhalten. Daher:

**Unit-Tests**, die einzigen beiden Stellen, die ohne laufenden Compositor prüfbar sind:

- `detect_mode` gegen synthetische Eingaben (Session-Typ × Registry-Inhalt × Override) —
  die einzige nicht-triviale Verzweigung
- `LinuxConfig`: Round-Trip laden/speichern, und dass fehlende oder kaputte JSON auf die
  Defaults fällt statt zu panicken. Ein Panic hier hieße: Widget startet nicht mehr.

**Manuelle Checkliste**, je Zielumgebung durchzugehen:

| Prüfung | KDE Wayland | GNOME Wayland | X11 |
|---|---|---|---|
| Fenster erscheint, rahmenlos, transparent | ✓ | ✓ | ✓ |
| Über normalen Fenstern | ✓ | ✓ | ✓ |
| Über Fullscreen-Fenster | ✓ | — | — |
| Nicht in Taskbar / Alt-Tab | ✓ | ✓ | ✓ |
| Nimmt keinen Fokus | ✓ | ✓ | ✓ |
| Ziehen funktioniert, Position überlebt Neustart | ✓ | ✓ | ✓ |
| Rechtsklickmenü an der Mausposition | ✓ | ✓ | ✓ |
| Settings-Änderung erreicht die Uhr sofort | ✓ | ✓ | ✓ |
| Autostart greift nach Reboot | ✓ | ✓ | ✓ |

GNOME wird in einer VM oder verschachtelten Session geprüft, nicht auf der Hauptmaschine.

**Windows-Regressionstest** nach dem Tauri-Upgrade: dieselbe Checkliste ohne die
Layer-Shell-Zeile, vom Autor auf seinem Windows-System.

## CI & Packaging

Neues `.github/workflows/release.yml`, ausgelöst per Tag. Bisher existiert kein Workflow;
Windows-Builds liefen lokal. Die CI ist also für beide Plattformen neu.

Matrix:

| Runner | Artefakte |
|---|---|
| `ubuntu-22.04` | `.deb`, `.rpm`, AppImage |
| `windows-latest` | NSIS-Setup / MSI wie bisher |

**Ubuntu 22.04, nicht 24.04:** baut gegen ältere glibc und WebKit, das Ergebnis läuft
dadurch auch auf neueren Systemen. Umgekehrt nicht.

Linux-Runner-Pakete: `libwebkit2gtk-4.1-dev`, `libgtk-layer-shell-dev`,
`libayatana-appindicator3-dev`, `librsvg2-dev`, `patchelf`.

`tauri-action` hängt die Artefakte an den GitHub-Release.

README bekommt einen Linux-Abschnitt: Installationswege, die Build-Abhängigkeit
`gtk-layer-shell-devel` / `libgtk-layer-shell-dev`, und eine ehrliche Tabelle, welcher
Desktop welche Stufe bekommt — insbesondere, dass GNOME kein Over-Fullscreen kann.

## Offener Messpunkt: Settings-Sync

`src/pages/atoms.ts` enthält im Arbeitsbaum ~165 Zeilen Cross-Window-Sync über
`BroadcastChannel` **und** den Tauri-Event-Bus. Behandelt wird ein reales Symptom: unter
WebKitGTK sehen Uhr-Fenster und Settings-Fenster getrennte `localStorage`-Stores.

Der `BroadcastChannel`-Teil ist mit hoher Wahrscheinlichkeit wirkungslos —
`BroadcastChannel` verbindet nur Kontexte desselben Origins **im selben Prozess**. Legt
WebKitGTK die Fenster in getrennte Web-Prozesse, kommt dort nie eine Message an, und der
Tauri-Event-Pfad trägt die Synchronisation allein.

**Vorgehen:** nach dem Tauri-Upgrade zwei Zeilen im Settings-Fenster schreiben, im
Uhr-Fenster lesen, nachsehen.

- Teilen sich die Webviews den Store → alle 165 Zeilen entfallen ersatzlos.
- Teilen sie ihn nicht → es bleibt der Tauri-Event-Pfad, geschätzt 30 Zeilen.

In beiden Fällen fliegt `BroadcastChannel` raus. Gemessen wird, bevor angefasst wird.

## Reihenfolge

1. **Tauri-Upgrade** `2.0.0-beta.19` → `2.11.5`, inkl. JS-API-Migration
   (`getCurrent` → `getCurrentWindow`, `getAll` → `getAllWindows`, Plugin-Versionen).
   Windows-Gegentest durch den Autor. Erst danach wird Linux angefasst — sonst debuggen
   wir gegen Bugs, die upstream längst behoben sind.
2. **Messpunkt Settings-Sync** auflösen, `atoms.ts` entsprechend eindampfen.
3. **`overlay.rs`** mit Erkennung und beiden Pfaden, `visible: false`, `apply` in `setup()`.
4. **Drag in Modus A**, Margin-Persistenz, `get_overlay_mode` im Frontend.
5. **Settings-Dropdown** für den Override.
6. **CI, Packaging, README.**
7. **Manuelle Checkliste** auf KDE Wayland, KDE X11, GNOME (VM), Windows.

Schritt 1 und 2 sind Voraussetzung für alles Weitere. Ab Schritt 3 gilt: nach jedem
Schritt läuft die App noch.
