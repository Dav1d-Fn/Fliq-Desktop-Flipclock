import "../styles/styles.css"
import '@mantine/core/styles.css'
import "@pqina/flip/dist/flip.min.css"

import { useEffect, useState } from "react"
import FlipClock from "./FlipClock"

//import Tauri APIs
import { invoke } from '@tauri-apps/api/core'
import { emitTo } from '@tauri-apps/api/event'
import { getCurrentWindow, getAllWindows } from '@tauri-apps/api/window'
import { PhysicalPosition, LogicalSize } from '@tauri-apps/api/dpi'
import { Webview } from '@tauri-apps/api/webview';
import { CheckMenuItem, Menu, MenuItem } from '@tauri-apps/api/menu'
import { enable, disable } from '@tauri-apps/plugin-autostart';
import { saveWindowState, StateFlags, restoreStateCurrent } from '@tauri-apps/plugin-window-state';

//import Jotai for state management
import { ATOMS } from "./atoms";
import { useAtom } from "jotai"
import { startTuxhub } from "../tuxhub"

// Globale Geometrie eines Outputs, wie get_monitors sie liefert. Der Index in dieser Liste ist
// zugleich der Index des zugehoerigen Ghost-Fensters.
type Monitor = { id: string; x: number; y: number; w: number; h: number; scale: number };

type OverlayState = { mode: string; margin_x: number; margin_y: number; monitor: string | null };

// Einmal pro Seitenaufruf. Rejected auf aelteren Builds ohne den Command.
const overlayState = invoke<OverlayState>("get_overlay_state");
const isLayerShell = () => overlayState.then((s) => s.mode === "layer-shell", () => false);

// Only the clock itself takes clicks; the transparent rest of the window lets them through.
// On the layer-shell path the window spans the whole output, elsewhere it cannot shrink below
// a GTK minimum size -- either way the empty area would block whatever lies underneath.
function updateInputRegion() {
  const rect = document.querySelector("#flipclock-container")?.getBoundingClientRect();
  if (!rect) return;
  invoke("set_input_region", {
    x: Math.floor(rect.left),
    y: Math.floor(rect.top),
    w: Math.ceil(rect.width),
    h: Math.ceil(rect.height),
  // The command only exists on Linux; elsewhere the window has no such problem.
  }).catch(() => {});
}

// Position of the clock inside the full-output window (layer-shell path only).
function placeClock(x: number, y: number) {
  const div = document.getElementById("maindiv");
  if (div) div.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  updateInputRegion();
}

function App() {

  const [autostart, setAutostart] = useAtom(ATOMS.AUTOSTART);
  const [hideInTaskbar, setHideInTaskbar] = useAtom(ATOMS.HIDE_IN_TASKBAR);
  const [alwaysOnTop, setAlwaysOnTop] = useAtom(ATOMS.ALWAYS_ON_TOP);
  const [clockPadding] = useAtom(ATOMS.CLOCK_PADDING);
  const [boxRadius, ] = useAtom(ATOMS.BOX_RADIUS);
  const [format] = useAtom(ATOMS.TIME_FORMAT);
  const [separatorString] = useAtom(ATOMS.SEPARATOR_STRING);
  const [clockSeparatorColor, ] = useAtom(ATOMS.CLOCK_SEPARATOR_COLOR);
  const [flipcardRadius, ] = useAtom(ATOMS.FLIPCARD_RADIUS);
  const [clockTextSize, ] = useAtom(ATOMS.CLOCK_TEXT_SIZE);
  const [language, ] = useAtom(ATOMS.LANGUAGE);

  // colors
  const [clockTextColor, ] = useAtom(ATOMS.CLOCK_TEXT_COLOR);
  const [boxBgColor, ] = useAtom(ATOMS.BOX_BACKGROUND);
  const [flipcardBg, ] = useAtom(ATOMS.FLIPCARD_BACKGROUND);

  // Weather related
  const [weatherLocation, ] = useAtom(ATOMS.WEATHER_LOCATION);
  const [weatherUnit, ] = useAtom(ATOMS.WEATHER_UNIT);
  const [sunTimes, ] = useAtom(ATOMS.SUN_TIMES);

  // Text related settings
  const [textFont, ] = useAtom(ATOMS.TEXT_FONT);
  const [textColor, ] = useAtom(ATOMS.TEXT_COLOR);

  // Second row settings (if applicable)
  const [secondRowEnabled, ] = useAtom(ATOMS.SECOND_ROW_ENABLED);
  const [secondRowClockTextSize, ] = useAtom(ATOMS.SECOND_ROW_CLOCK_TEXT_SIZE);
  const [secondRowTimeFormat, ] = useAtom(ATOMS.SECOND_ROW_TIME_FORMAT);
  const [secondRowGap, ] = useAtom(ATOMS.SECOND_ROW_GAP);

  // Weather related
  const [weatherData, ] = useAtom(ATOMS.WEATHER_DATA);
  
  const [key, setKey] = useState(1);

  async function initialWindowLoad() {
    await getCurrentWindow().setSkipTaskbar(hideInTaskbar);  
    await getCurrentWindow().setAlwaysOnTop(alwaysOnTop);
    //await getCurrentWindow().setSize(size);
    await restoreStateCurrent(StateFlags.POSITION);

    // On the layer-shell path the window is as large as its output, not as the clock.
    if (await isLayerShell()) return;

    // Get the container element instead of the inner clock
    const container = document.querySelector("#flipclock-container");

    if (container) {
      // Get actual element size
      const rect = container.getBoundingClientRect();
      
      // Ensure LogicalSize and getCurrent exist before using them
      if (typeof LogicalSize !== "undefined" && typeof getCurrentWindow === "function") {
        const size = new LogicalSize( rect.width + 2, rect.height + 2);
        getCurrentWindow().setSize(size);
      } else {
        console.warn("LogicalSize or getCurrent is not defined");
      }
    }

  }

  // Once per mount, not on every render: App re-renders on every atom change (weather data,
  // re-keying the clock), and each call fired four window IPC requests.
  useEffect(() => { initialWindowLoad(); }, []);
    
  useEffect(() => {

    //initialise Event Listeners
    
    //Save Window Position on unload
    const handleBeforeUnload = () => {
      saveWindowState(StateFlags.POSITION);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Im Layer-Shell-Modus ist die Uhr-Surface so gross wie ihr Output, und die Uhr sitzt per
    // CSS-Transform darin (`placeClock`). Ziehen verschiebt also nur ein Element -- so fluessig
    // wie jede Webseite. Ueber die Surface ziehen konnte man die Uhr nicht: KWin wendet
    // Margin-Aenderungen nur schubweise mit ~200 ms Verzug an.
    //
    // Ein Layer-Surface gehoert aber zu genau einem Output, die Uhr wird an dessen Rand
    // abgeschnitten. Ragt sie beim Ziehen auf einen anderen Monitor, zeichnet der Ghost dieses
    // Monitors (ein durchklickbares Vollbild-Fenster je Output) dort eine Kopie der Uhr. Beim
    // Loslassen auf einem anderen Monitor wird die Uhr-Surface dorthin umgehaengt; die Kopie
    // steht so lange an genau der Stelle und ueberbrueckt das.
    //
    // Auf X11/Windows/macOS ist das Fenster so gross wie die Uhr und `startDragging` zieht es.

    // `pos` ist output-LOKAL (Lage der Uhr in der Surface), `monitorId` sagt, auf welchem Output.
    const dragState = {
      mode: "native",
      pos: { x: 0, y: 0 },
      monitors: [] as Monitor[],
      monitorId: null as string | null,
    };

    const ghostLabel = (mon: Monitor) => `ghost-${dragState.monitors.indexOf(mon)}`;

    // Der Output, auf dem ein globaler Punkt liegt. `undefined` bei einer Luecke zwischen den
    // Schirmen (Layouts muessen nicht lueckenlos sein).
    const monitorAt = (gx: number, gy: number) =>
      dragState.monitors.find((m) => gx >= m.x && gx < m.x + m.w && gy >= m.y && gy < m.y + m.h);

    const currentMonitor = () => dragState.monitors.find((m) => m.id === dragState.monitorId);

    const clockSize = () => {
      const rect = document.querySelector("#flipclock-container")?.getBoundingClientRect();
      return { w: rect?.width ?? 0, h: rect?.height ?? 0 };
    };

    // Haelt die ganze Uhr auf ihrem Monitor. Angewendet beim Loslassen, nicht waehrend des
    // Ziehens -- dort darf sie ueber eine Monitorgrenze ragen.
    const clampToMonitor = (mon: Monitor, x: number, y: number) => {
      const { w, h } = clockSize();
      return {
        x: Math.round(Math.min(Math.max(0, mon.w - w), Math.max(0, x))),
        y: Math.round(Math.min(Math.max(0, mon.h - h), Math.max(0, y))),
      };
    };

    // Beim Laden gilt bewusst eine SCHWAECHERE Regel als beim Loslassen: korrigiert wird nur,
    // was vollstaendig ausserhalb liegt und damit gar nicht mehr auffindbar waere. (Den Fall
    // "gespeicherter Monitor gibt es nicht mehr" faengt Rust beim Start ab.)
    const rescuePos = (mon: Monitor | undefined, x: number, y: number) => {
      const b = mon ?? { w: window.screen.width, h: window.screen.height };
      return { x: x < 0 || x >= b.w ? 40 : x, y: y < 0 || y >= b.h ? 40 : y };
    };

    const persistPlacement = (x: number, y: number) =>
      (dragState.mode === "layer-shell" && dragState.monitorId
        ? invoke("set_overlay_placement", { monitorId: dragState.monitorId, x, y })
        : invoke("set_overlay_margin", { x, y, persist: true })
      ).catch((err) => console.error("Position speichern fehlgeschlagen:", err));

    overlayState
      .then(async (s) => {
        dragState.mode = s.mode;
        dragState.monitorId = s.monitor;
        if (s.mode !== "layer-shell") return;

        dragState.monitors = await invoke<Monitor[]>("get_monitors").catch((err) => {
          console.error("get_monitors fehlgeschlagen:", err);
          return [];
        });

        const safe = rescuePos(currentMonitor(), s.margin_x, s.margin_y);
        dragState.pos = safe;
        placeClock(safe.x, safe.y);

        // Lag der gespeicherte Wert daneben, sofort korrigiert zurueckschreiben -- sonst holt
        // sich der naechste Start denselben unbrauchbaren Wert wieder.
        if (safe.x !== s.margin_x || safe.y !== s.margin_y) {
          console.warn(`fliq: Position ${s.margin_x}/${s.margin_y} lag ausserhalb des Monitors, korrigiert auf ${safe.x}/${safe.y}`);
          persistPlacement(safe.x, safe.y);
        }
      })
      .catch(() => { /* aeltere Builds ohne den Command: bleibt bei "native" */ })
      // Erst jetzt zeigen: vorher stuende die Uhr fuer einen Moment oben links.
      .finally(() => {
        const div = document.getElementById("maindiv");
        if (div) div.style.visibility = "visible";
      });

    // Ein Eintrag pro pointerId, damit ein zweites Zeigegeraet den Drag eines ersten nicht
    // ueberschreibt. Der Cleanup dieses Effects raeumt alle noch aktiven Drags auf.
    const activeDrags = new Map<number, () => void>();

    async function handlePointerDown(e: PointerEvent) {
      if (e.button !== 0) return;

      const target = e.currentTarget as HTMLElement;
      const pointerId = e.pointerId;

      // Capture sofort und synchron anfordern, nicht erst nach dem await: ab hier bekommt
      // `target` alle Pointer-Events, auch ausserhalb der Klickflaeche und auf anderen Monitoren
      // (Wayland gibt der Surface mit gedrueckter Taste einen impliziten Grab).
      target.setPointerCapture(pointerId);

      await overlayState.catch(() => null);

      // Wer waehrend des `await` schon losgelassen hat: nichts angelegt, nichts aufzuraeumen.
      if (!target.hasPointerCapture(pointerId)) return;

      if (dragState.mode !== "layer-shell") {
        target.releasePointerCapture(pointerId);
        getCurrentWindow().startDragging();
        return;
      }

      // Gerechnet wird in GLOBALEN Koordinaten, weil nur die ueber Monitorgrenzen hinweg
      // durchgehend sind. Die Zeigerdeltas taugen dafuer, weil die Surface sich waehrend des
      // Ziehens nicht bewegt.
      const home = currentMonitor() ?? { id: "", x: 0, y: 0, w: window.innerWidth, h: window.innerHeight, scale: 1 };
      const others = dragState.monitors.filter((m) => m.id !== home.id);
      const startScreenX = e.screenX;
      const startScreenY = e.screenY;
      const originX = home.x + dragState.pos.x;
      const originY = home.y + dragState.pos.y;
      const { w, h } = clockSize();

      // Ziehen bleibt innerhalb der Huelle aller Monitore; wo genau die Uhr landet, entscheidet
      // erst das Loslassen.
      const all = dragState.monitors.length ? dragState.monitors : [home];
      const minX = Math.min(...all.map((m) => m.x));
      const minY = Math.min(...all.map((m) => m.y));
      const maxX = Math.max(...all.map((m) => m.x + m.w)) - w;
      const maxY = Math.max(...all.map((m) => m.y + m.h)) - h;

      let gx = originX;
      let gy = originY;
      let frame = 0;
      let ghostsShown = false;
      // Welche Ghosts gerade eine Kopie zeigen -- nur an die wird "unsichtbar" geschickt.
      const ghostVisible = new Map<string, boolean>();

      const paintGhost = (mon: Monitor, visible: boolean) => {
        const label = ghostLabel(mon);
        if (!visible && !ghostVisible.get(label)) return;
        ghostVisible.set(label, visible);
        emitTo(label, "ghost-pos", { x: Math.round(gx - mon.x), y: Math.round(gy - mon.y), visible })
          .catch((err) => console.error("ghost-pos fehlgeschlagen:", err));
      };

      const paint = () => {
        frame = 0;
        placeClock(gx - home.x, gy - home.y);
        if (!ghostsShown) return;
        others.forEach((m) =>
          paintGhost(m, gx < m.x + m.w && gx + w > m.x && gy < m.y + m.h && gy + h > m.y));
      };

      // Alle Ghosts zeigen (jeder leer, transparent und durchklickbar). Erst danach Positionen
      // schicken, sonst leerte `ghost_show` eine gerade gesetzte Kopie wieder.
      invoke("ghost_show")
        .then(() => {
          ghostsShown = true;
          if (!frame) frame = requestAnimationFrame(paint);
        })
        .catch((err) => console.error("ghost_show fehlgeschlagen:", err));

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        gx = Math.min(maxX, Math.max(minX, originX + (ev.screenX - startScreenX)));
        gy = Math.min(maxY, Math.max(minY, originY + (ev.screenY - startScreenY)));
        if (!frame) frame = requestAnimationFrame(paint);
      };

      const onEnd = async (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        detach();
        if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }

        // Zielmonitor ist der, auf dem die Mitte der Uhr liegt.
        const dest = monitorAt(gx + w / 2, gy + h / 2) ?? monitorAt(gx, gy) ?? home;
        const pos = clampToMonitor(dest, gx - dest.x, gy - dest.y);
        dragState.pos = pos;

        if (dest.id !== home.id && ghostsShown) {
          // Die Kopie steht genau am Ziel, waehrend die Uhr-Surface umgehaengt wird. Die Uhr
          // selbst ist solange unsichtbar, sonst blitzte sie auf dem alten Monitor auf.
          gx = dest.x + pos.x;
          gy = dest.y + pos.y;
          paintGhost(dest, true);
          others.filter((m) => m.id !== dest.id).forEach((m) => paintGhost(m, false));
          const div = document.getElementById("maindiv");
          if (div) div.style.visibility = "hidden";
          dragState.monitorId = dest.id;
          await persistPlacement(pos.x, pos.y);
          placeClock(pos.x, pos.y);
          if (div) div.style.visibility = "visible";
          // Zwei Frames, damit die Uhr am neuen Ort gemalt ist, bevor die Kopie verschwindet.
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        } else {
          dragState.monitorId = dest.id || dragState.monitorId;
          placeClock(pos.x, pos.y);
          persistPlacement(pos.x, pos.y);
        }
        finish();
      };

      const detach = () => {
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onEnd);
        target.removeEventListener("pointercancel", onEnd);
        if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
      };

      // Laeuft auf jedem Weg, der den Drag beendet. Zusaetzlich blendet Rust die Ghosts nach
      // einem Sicherheits-Timeout aus, falls dieser Webview vorher stirbt.
      const finish = () => {
        detach();
        if (frame) cancelAnimationFrame(frame);
        invoke("ghost_hide").catch((err) => console.error("ghost_hide fehlgeschlagen:", err));
        activeDrags.delete(pointerId);
      };

      activeDrags.set(pointerId, finish);

      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", onEnd);
      target.addEventListener("pointercancel", onEnd);
    }

    const div = document.getElementById('maindiv');
    if(div)
    {
      div.addEventListener("pointerdown", handlePointerDown);
    }

    return () => {
      // Clean up the event listener
      if(div)
      {
        div.removeEventListener("pointerdown", handlePointerDown);
      }
      Array.from(activeDrags.values()).forEach((cleanup) => cleanup());
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveWindowState(StateFlags.POSITION);
    };
  }, []);

  // Settings page in tuxhub, if it is installed (src/tuxhub.ts)
  useEffect(() => startTuxhub(), []);

  //Adjust the window size when the clock size changes
  useEffect(() => {
    isLayerShell().then((layerShell) => {
      if (layerShell) return;
      // Get the container element instead of the inner clock
      const container = document.querySelector("#flipclock-container");

      if (container) {
        // Get actual element size
        const rect = container.getBoundingClientRect();

        // Ensure LogicalSize and getCurrent exist before using them
        if (typeof LogicalSize !== "undefined" && typeof getCurrentWindow === "function") {
          const size = new LogicalSize( rect.width + 2, rect.height +2);
          getCurrentWindow().setSize(size);
        } else {
          console.warn("LogicalSize or getCurrent is not defined");
        }
      }
    });
  }, [clockTextSize, secondRowClockTextSize, clockPadding])

  // Re-attached on `key`, because the container remounts with the clock. Position changes are
  // covered by the drag code, which calls updateInputRegion itself.
  useEffect(() => {
    const container = document.querySelector("#flipclock-container");
    if (!container) return;
    const observer = new ResizeObserver(updateInputRegion);
    observer.observe(container);
    return () => observer.disconnect();
  }, [key]);

  //Re-render the clock when the format changes
  useEffect(() => {
    setKey(prevKey => prevKey + 1);
    //console.log("Clock format changed, re-rendering clock with key:", key); // Debug
  }, [format, separatorString, clockTextSize, clockPadding, language, secondRowEnabled, secondRowClockTextSize, secondRowTimeFormat, secondRowGap, clockTextColor, boxBgColor, flipcardBg, flipcardRadius, boxRadius, clockSeparatorColor, sunTimes, weatherData, weatherLocation, weatherUnit, textFont, textColor]);

  //Open the styling window
  async function open_stylingmenu() {
    const existing = await Webview.getByLabel('Styling');
    if (!existing) {
      await invoke("open_stylingmenu_window");
    }
    console.log("Window was opened");
  }

  //Toggle the autostart setting
  async function toggle_autostart() {
    if(autostart) {
      disable()
      setAutostart(false)
    } else {
      await enable()
      setAutostart(true)
    }
  }

  //Toggle the hideInTaskbar setting
  async function toggle_hideInTaskbar() {
    if(hideInTaskbar) {
      getCurrentWindow().setSkipTaskbar(false);
      setHideInTaskbar(false)
    } else {
      getCurrentWindow().setSkipTaskbar(true);
      setHideInTaskbar(true)
    }
  }

  //Toggle the alwaysOnTop setting
  async function toggle_alwaysOnTop() {
    if(alwaysOnTop) {
      getCurrentWindow().setAlwaysOnTop(false);
      setAlwaysOnTop(false)
    } else {
      getCurrentWindow().setAlwaysOnTop(true);
      setAlwaysOnTop(true)
    }
  }

  //Definition of Context Menu
  async function open_context_menu(e: any) {

    const settingsItem = await MenuItem.new({enabled:true ,text: "Styling", action: () => {open_stylingmenu()}});
    const autostartItem = await CheckMenuItem.new({checked: autostart, enabled: true , text: "Autostart", action: () => { toggle_autostart() }});
    const hideInTaskbarItem = await CheckMenuItem.new({checked: hideInTaskbar, enabled: true , text: "Hide in Taskbar", action: () => { toggle_hideInTaskbar() }});
    const alwaysOnTopItem = await CheckMenuItem.new({checked: alwaysOnTop, enabled: true , text: "Always on Top", action: () => { toggle_alwaysOnTop() }});
    const exitItem = await MenuItem.new({enabled:true ,text: "Exit", action: async () => { (await getAllWindows()).forEach( window => { window.close(); }); }});

    const menu = await Menu.new({items: [settingsItem, autostartItem, hideInTaskbarItem, alwaysOnTopItem, exitItem]});

    const position: PhysicalPosition = new PhysicalPosition(e.clientX, e.clientY);
    await menu.popup(position);

  }

  return (
      // Hidden until the overlay state is known (set imperatively, like the transform), otherwise
      // the clock would flash in the top left corner of the output first.
      <div id="maindiv" style={{ position: "absolute", left: 0, top: 0, visibility: "hidden" }} onContextMenu={e => { e.preventDefault(); e.stopPropagation(); open_context_menu(e); }}>
        <FlipClock key={key} format={format} secondRowTimeFormat={secondRowTimeFormat} onLayoutChange={() => setKey(k => k + 1)}/>
      </div>
  );

}

export default App;

