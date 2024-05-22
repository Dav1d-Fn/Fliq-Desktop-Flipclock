import "./styles.css"
import '@mantine/core/styles.css'
import "@pqina/flip/dist/flip.min.css"

import { useEffect, useState } from "react"
import FlipClock from "./FlipClock"

import { invoke } from '@tauri-apps/api/core'
import { PhysicalPosition, getCurrent, getAll, LogicalSize, PhysicalSize } from '@tauri-apps/api/window' //getCurrent gets the current window, getAll gets all windows
import { Webview } from '@tauri-apps/api/webview';
import { CheckMenuItem, Menu, MenuItem } from '@tauri-apps/api/menu'
import { enable, disable } from '@tauri-apps/plugin-autostart';
import { saveWindowState, StateFlags, restoreStateCurrent } from '@tauri-apps/plugin-window-state';

import { atomWithStorage } from "jotai/utils"
import { useAtom } from "jotai"

const autostartAtom = atomWithStorage('autostart', false)
const hideInTaskbarAtom = atomWithStorage('hideInTaskbar', true)
//clockWidth is an integer with represents the width of the window
const clockWidthAtom = atomWithStorage('clockWidth', 15)
const clockPaddingAtom = atomWithStorage('clockPadding', 0)
const formatAtom = atomWithStorage("format", "hhmmss")
const seperatorStringAtom = atomWithStorage("seperatorString"," /\\,.:")

function App() {

  const [autostart, setAutostart] = useAtom(autostartAtom);
  const [hideInTaskbar, setHideInTaskbar] = useAtom(hideInTaskbarAtom);
  const [clockWidth, ] = useAtom(clockWidthAtom);
  const [clockPadding, ] = useAtom(clockPaddingAtom);
  const [format,] = useAtom(formatAtom);
  const [seperatorString,] = useAtom(seperatorStringAtom);
  

  const [key, setKey] = useState(1);

  const size = new LogicalSize((clockWidth+30)*5, (clockWidth+30)*5/2);

  async function initialWindowLoad() {
    await getCurrent().setSkipTaskbar(hideInTaskbar);  
    await getCurrent().setAlwaysOnTop(true);
    await getCurrent().setResizable(false);
    await getCurrent().setMaximizable(false);
    await getCurrent().setSize(size);
    await restoreStateCurrent(StateFlags.POSITION);
  }

  initialWindowLoad();
    
  useEffect(() => {

    async function handleMouseDown(e:any) {
      if (e.button === 0) 
        await getCurrent().startDragging();
    }

    const handleBeforeUnload = () => {
      saveWindowState(StateFlags.POSITION);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

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

  useEffect(() => {
      const size = new LogicalSize((clockWidth+30)*5, (clockWidth+30)*5/2);
      getCurrent().setSize(size);
  }, [clockWidth, clockPadding])

  useEffect(() => {
    setKey(prevKey => prevKey + 1);
  }, [format, seperatorString])

  async function open_colorpicker() {
    if(!Webview.getByLabel('Styling'))
      await invoke("open_stylingmenu_window") ; 
    console.log("Window was opened") ; 
  }

  async function toggle_autostart() {
    if(autostart) {
      disable()
      setAutostart(false)
    } else {
      await enable()
      setAutostart(true)
    }
  }

  async function toggle_hideInTaskbar() {
    if(hideInTaskbar) {
      getCurrent().setSkipTaskbar(false);
      setHideInTaskbar(false)
    } else {
      getCurrent().setSkipTaskbar(true);
      setHideInTaskbar(true)
    }
  }

  async function open_context_menu(e: any) {

    const settingsItem = await MenuItem.new({enabled:true ,text: "Styling", action: () => {open_colorpicker()}});
    const autostartItem = await CheckMenuItem.new({checked: autostart, enabled: true , text: "Autostart", action: () => { toggle_autostart() }});
    const hideInTaskbarItem = await CheckMenuItem.new({checked: hideInTaskbar, enabled: true , text: "Hide in Taskbar", action: () => { toggle_hideInTaskbar() }});
    const exitItem = await MenuItem.new({enabled:true ,text: "Exit", action: () => { getAll().forEach( window => { window.close(); }); }});

    const menu = await Menu.new({items: [settingsItem, autostartItem, hideInTaskbarItem, exitItem]});

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

