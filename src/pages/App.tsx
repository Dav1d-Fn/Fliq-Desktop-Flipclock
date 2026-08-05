import "../styles/styles.css"
import '@mantine/core/styles.css'
import "@pqina/flip/dist/flip.min.css"

import { useEffect, useState } from "react"
import FlipClock from "./FlipClock"

//import Tauri APIs
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow, getAllWindows } from '@tauri-apps/api/window'
import { PhysicalPosition, LogicalSize } from '@tauri-apps/api/dpi'
import { Webview } from '@tauri-apps/api/webview';
import { CheckMenuItem, Menu, MenuItem } from '@tauri-apps/api/menu'
import { enable, disable } from '@tauri-apps/plugin-autostart';
import { saveWindowState, StateFlags, restoreStateCurrent } from '@tauri-apps/plugin-window-state';

//import Jotai for state management
import { ATOMS } from "./atoms";
import { useAtom } from "jotai"

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

  initialWindowLoad();
    
  useEffect(() => {

    //initialise Event Listeners
    
    //Save Window Position on unload
    const handleBeforeUnload = () => {
      saveWindowState(StateFlags.POSITION);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Im Layer-Shell-Modus positioniert der Compositor das Fenster; startDragging gibt es
    // dort nicht. Der Drag wird deshalb in Anker-Margins uebersetzt.
    //
    // mode/margin leben auf einem Objekt statt auf `let`-Bindings, damit handlePointerDown sie
    // bei jedem Aufruf frisch liest. Zusaetzlich wartet handlePointerDown auf overlayStateReady,
    // damit ein Drag, der vor der Antwort von get_overlay_state beginnt, nicht faelschlich mit
    // dem Default "native" laeuft -- im Layer-Shell-Modus waere startDragging() dort
    // stillschweigend wirkungslos.
    const dragState = { mode: "native", margin: { x: 0, y: 0 } };

    const overlayStateReady = invoke<{ mode: string; margin_x: number; margin_y: number }>("get_overlay_state")
      .then((s) => {
        dragState.mode = s.mode;
        dragState.margin = { x: s.margin_x, y: s.margin_y };
      })
      .catch(() => { /* aeltere Builds ohne den Command: bleibt bei "native" */ });

    // Ein Eintrag pro pointerId, damit ein zweites Zeigegeraet (z.B. Touch neben Maus) den
    // Drag eines ersten nicht ueberschreibt -- jeder Drag traegt seine eigene Teardown-Funktion
    // ein und entfernt nur die eigene. Der Cleanup dieses Effects raeumt alle noch aktiven
    // Drags auf (z.B. bei Unmount waehrend eines Drags).
    const activeDrags = new Map<number, () => void>();

    async function handlePointerDown(e: PointerEvent) {
      if (e.button !== 0) return;

      const target = e.currentTarget as HTMLElement;
      const pointerId = e.pointerId;

      // Capture sofort und synchron im pointerdown-Handler anfordern, nicht erst nach dem
      // await unten. Ab hier bekommt `target` pointermove/pointerup/pointercancel unabhaengig
      // davon, ob der Cursor die Fensterflaeche verlaesst -- auf Wayland liefert der Compositor
      // sonst nach Verlassen der Surface keine Pointer-Events mehr, und ein ausserhalb
      // losgelassener Drag bliebe sonst fuer immer haengen (Listener + laufende invoke-Aufrufe).
      target.setPointerCapture(pointerId);

      await overlayStateReady;

      if (dragState.mode !== "layer-shell") {
        target.releasePointerCapture(pointerId);
        getCurrentWindow().startDragging();
        return;
      }

      const startX = e.screenX;
      const startY = e.screenY;
      const base = { ...dragState.margin };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        dragState.margin = {
          x: Math.max(0, base.x + (ev.screenX - startX)),
          y: Math.max(0, base.y + (ev.screenY - startY)),
        };
        invoke("set_overlay_margin", { x: dragState.margin.x, y: dragState.margin.y, persist: false });
      };

      // pointerup (normale Freigabe) und pointercancel (Compositor entzieht die Capture, z.B.
      // ein Systemgesture uebernimmt) beenden den Drag gleich: einmal mit dem finalen Margin
      // persistieren, dann aufraeumen.
      const onEnd = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        invoke("set_overlay_margin", { x: dragState.margin.x, y: dragState.margin.y, persist: true });
        cleanup();
      };

      const cleanup = () => {
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onEnd);
        target.removeEventListener("pointercancel", onEnd);
        if (target.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
        activeDrags.delete(pointerId);
      };

      activeDrags.set(pointerId, cleanup);

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

  //Adjust the window size when the clock size changes
  useEffect(() => {
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
      console.log("Clock size changed, adjusting window size to:", clockTextSize, secondRowClockTextSize, clockPadding); // Debug
  }, [clockTextSize, secondRowClockTextSize, clockPadding])

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
      <div id="maindiv" onContextMenu={e => { e.preventDefault(); e.stopPropagation(); open_context_menu(e); }}>
        <FlipClock key={key} format={format} secondRowTimeFormat={secondRowTimeFormat}/>
      </div>
  );

}

export default App;

