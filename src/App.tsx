import "./styles.css"
import '@mantine/core/styles.css'
import "@pqina/flip/dist/flip.min.css"

import FlipClock from "./FlipClock"
import { PhysicalPosition, getCurrent, getAll, LogicalSize } from '@tauri-apps/api/window' //getCurrent gets the current window, getAll gets all windows
import { enable, disable } from '@tauri-apps/plugin-autostart';
import { Webview } from '@tauri-apps/api/webview';
import { CheckMenuItem, Menu, MenuItem } from '@tauri-apps/api/menu'
import { invoke } from '@tauri-apps/api/core'
import { atomWithStorage } from "jotai/utils"
import { useAtom } from "jotai"

const autostartAtom = atomWithStorage('autostart', false)
const hideInTaskbarAtom = atomWithStorage('hideInTaskbar', true)
//clockSize is an integer with represents the width of the window
const clockSizeAtom = atomWithStorage('clockSize', 100)

function App() {

  const [autostart, setAutostart] = useAtom(autostartAtom);
  const [hideInTaskbar, setHideInTaskbar] = useAtom(hideInTaskbarAtom);
  const [clockSize, setClockSize] = useAtom(clockSizeAtom);

  if(clockSize < 10) setClockSize(100)

  getCurrent().setAlwaysOnTop(true);
  getCurrent().setSkipTaskbar(hideInTaskbar);
  getCurrent().setSize(new LogicalSize(clockSize, getWindowHeight()));

  function getWindowHeight() {
    var elem = document.getElementById('flipClockDiv')
    if(elem) {
      return elem.clientHeight+5;
    } else {
      return 100;
    }
  }

  async function open_colorpicker() {
    if(!Webview.getByLabel('Colorpicker'))
      await invoke("open_colorpicker_window") ; 
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

  document.addEventListener("mousedown", async e => {
      if(e.button === 0)
        await getCurrent().startDragging();
  });

  async function open_context_menu(e: any) {

    const settingsItem = await MenuItem.new({enabled:true ,text: "Settings", action: () => {open_colorpicker()}});
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

