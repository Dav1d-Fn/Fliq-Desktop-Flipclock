import "./styles.css"
import '@mantine/core/styles.css'
import "@pqina/flip/dist/flip.min.css"

import { useEffect } from "react"
import FlipClock from "./FlipClock"

import { invoke } from '@tauri-apps/api/core'
import { PhysicalPosition, getCurrent, getAll, LogicalSize } from '@tauri-apps/api/window' //getCurrent gets the current window, getAll gets all windows
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

function App() {

  const [autostart, setAutostart] = useAtom(autostartAtom);
  const [hideInTaskbar, setHideInTaskbar] = useAtom(hideInTaskbarAtom);
  const [clockWidth, ] = useAtom(clockWidthAtom);
  const [clockPadding, ] = useAtom(clockPaddingAtom);

  restoreStateCurrent(StateFlags.ALL);
  getCurrent().setAlwaysOnTop(true);
  getCurrent().setSkipTaskbar(hideInTaskbar);
  getCurrent().setResizable(false);
  getCurrent().setMaximizable(false);

  useEffect(() => {
    
    async function handleMouseDown(e:any) {
      if (e.button === 0) 
        await getCurrent().startDragging();
        saveWindowState(StateFlags.ALL);
    }

    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      // Clean up the event listener
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  useEffect(() => {
      const size = new LogicalSize((clockWidth+30)*5, getWindowHeight());
      getCurrent().setSize(size);
      saveWindowState(StateFlags.ALL);
  }, [clockWidth, clockPadding])

  function getWindowHeight() {
    var elem = document.getElementById('flipclockdiv')
    if(elem) {
      return (elem.clientHeight+(2*clockPadding)+90);
    } else {
      return 200;
    }
  }

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

    const menu = await Menu.new({items: [ settingsItem, autostartItem, hideInTaskbarItem, exitItem]});

    const position: PhysicalPosition = new PhysicalPosition(e.clientX, e.clientY);
    await menu.popup(position); 

  }

  return (
      <div onContextMenu={e => open_context_menu(e)}>
        <FlipClock/>
      </div>
  );

}

export default App;

