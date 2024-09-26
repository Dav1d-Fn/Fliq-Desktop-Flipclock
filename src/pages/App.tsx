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
import { atomWithStorage } from "jotai/utils"
import { useAtom } from "jotai"

//initialise Jotai Storage
const autostartAtom = atomWithStorage('autostart', false)
const hideInTaskbarAtom = atomWithStorage('hideInTaskbar', true)
const alwaysOnTopAtom = atomWithStorage('alwaysOnTop', true)
const clockWidthAtom = atomWithStorage('clockWidth', 250)
const clockPaddingAtom = atomWithStorage('clockPadding', 20)
const formatAtom = atomWithStorage("format", "HH:mm:ss")
const seperatorStringAtom = atomWithStorage("seperatorString"," /\\,.:")

function App() {

  const [autostart, setAutostart] = useAtom(autostartAtom);
  const [hideInTaskbar, setHideInTaskbar] = useAtom(hideInTaskbarAtom);
  const [alwaysOnTop, setAlwaysOnTop] = useAtom(alwaysOnTopAtom);
  const [clockWidth, setClockWidth] = useAtom(clockWidthAtom);
  const [clockPadding, ] = useAtom(clockPaddingAtom);
  const [format,] = useAtom(formatAtom);
  const [seperatorString,] = useAtom(seperatorStringAtom);
  
  const [key, setKey] = useState(1);

  if(clockWidth < 150) {
    setClockWidth(150);
  } 
 
  const size = new LogicalSize(clockWidth, clockWidth);

  async function initialWindowLoad() {
    await getCurrent().setSkipTaskbar(hideInTaskbar);  
    await getCurrent().setAlwaysOnTop(alwaysOnTop);
    await getCurrent().setSize(size);
    await restoreStateCurrent(StateFlags.POSITION);

    const elem = document.querySelector("#flipclockdivwithpadding");
      if(elem) {
        const rect = elem.getBoundingClientRect();
        console.log(`height: ${rect.height}`);

        const size = new LogicalSize(clockWidth, rect.height);
        //const size = new LogicalSize((clockWidth+30)*5, (clockWidth+30)*5/2);
        getCurrent().setSize(size);
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
      const size = new LogicalSize(clockWidth, clockWidth);
      //const size = new LogicalSize((clockWidth+30)*5, (clockWidth+30)*5/2);
      getCurrent().setSize(size);

      const elem = document.querySelector("#flipclockdivwithpadding");
      if(elem) {
        const rect = elem.getBoundingClientRect();
        console.log(`height: ${rect.height}`);

        const size = new LogicalSize(clockWidth, rect.height);
        //const size = new LogicalSize((clockWidth+30)*5, (clockWidth+30)*5/2);
        getCurrent().setSize(size);
      }

      
  }, [clockWidth, clockPadding])

  //Re-render the clock when the format changes
  useEffect(() => {
    setKey(prevKey => prevKey + 1);
  }, [format, seperatorString, clockWidth, clockPadding])

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
        <FlipClock key={key} format={format}/>
      </div>
  );

}

export default App;

