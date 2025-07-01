import "../styles/styles.css"
import '@mantine/core/styles.css'
import "@pqina/flip/dist/flip.min.css"

import { useEffect, useState } from "react"
import FlipClock from "./FlipClock"

//import Tauri APIs
import { invoke } from '@tauri-apps/api/core'
import { PhysicalPosition, getCurrent, getAll, LogicalSize} from '@tauri-apps/api/window' //getCurrent gets the current window, getAll gets all windows
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
    await getCurrent().setSkipTaskbar(hideInTaskbar);  
    await getCurrent().setAlwaysOnTop(alwaysOnTop);
    //await getCurrent().setSize(size);
    await restoreStateCurrent(StateFlags.POSITION);

    // Get the container element instead of the inner clock
    const container = document.querySelector("#flipclock-container");

    if (container) {
      // Get actual element size
      const rect = container.getBoundingClientRect();
      
      // Ensure LogicalSize and getCurrent exist before using them
      if (typeof LogicalSize !== "undefined" && typeof getCurrent === "function") {
        const size = new LogicalSize( rect.width + 2, rect.height + 2);
        getCurrent().setSize(size);
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

    //Start dragging on left mouse click
    async function handleMouseDown(e:any) {
      if (e.button === 0) 
        await getCurrent().startDragging();
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

  //Adjust the window size when the clock size changes
  useEffect(() => {
      // Get the container element instead of the inner clock
      const container = document.querySelector("#flipclock-container");

      if (container) {
        // Get actual element size
        const rect = container.getBoundingClientRect();

        // Ensure LogicalSize and getCurrent exist before using them
        if (typeof LogicalSize !== "undefined" && typeof getCurrent === "function") {
          const size = new LogicalSize( rect.width + 2, rect.height +2);
          getCurrent().setSize(size);
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
    if(!Webview.getByLabel('Styling'))
      await invoke("open_stylingmenu_window") ; 
    console.log("Window was opened") ; 
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
      getCurrent().setSkipTaskbar(false);
      setHideInTaskbar(false)
    } else {
      getCurrent().setSkipTaskbar(true);
      setHideInTaskbar(true)
    }
  }

  //Toggle the alwaysOnTop setting
  async function toggle_alwaysOnTop() {
    if(alwaysOnTop) {
      getCurrent().setAlwaysOnTop(false);
      setAlwaysOnTop(false)
    } else {
      getCurrent().setAlwaysOnTop(true);
      setAlwaysOnTop(true)
    }
  }

  //Definition of Context Menu
  async function open_context_menu(e: any) {

    const settingsItem = await MenuItem.new({enabled:true ,text: "Styling", action: () => {open_stylingmenu()}});
    const autostartItem = await CheckMenuItem.new({checked: autostart, enabled: true , text: "Autostart", action: () => { toggle_autostart() }});
    const hideInTaskbarItem = await CheckMenuItem.new({checked: hideInTaskbar, enabled: true , text: "Hide in Taskbar", action: () => { toggle_hideInTaskbar() }});
    const alwaysOnTopItem = await CheckMenuItem.new({checked: alwaysOnTop, enabled: true , text: "Always on Top", action: () => { toggle_alwaysOnTop() }});
    const exitItem = await MenuItem.new({enabled:true ,text: "Exit", action: () => { getAll().forEach( window => { window.close(); }); }});

    const menu = await Menu.new({items: [settingsItem, autostartItem, hideInTaskbarItem, alwaysOnTopItem, exitItem]});

    const position: PhysicalPosition = new PhysicalPosition(e.clientX, e.clientY);
    await menu.popup(position); 

  }

  return (
      <div id="maindiv" onContextMenu={e => open_context_menu(e)}>
        <FlipClock key={key} format={format} secondRowTimeFormat={secondRowTimeFormat}/>
      </div>
  );

}

export default App;

