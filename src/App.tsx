import "./styles.css"
import '@mantine/core/styles.css'
import "@pqina/flip/dist/flip.min.css"

import FlipClock from "./FlipClock"
import { PhysicalPosition, getCurrent, getAll } from '@tauri-apps/api/window' //getCurrent gets the current window, getAll gets all windows
import { enable, disable } from '@tauri-apps/plugin-autostart';
import { Webview } from '@tauri-apps/api/webview';
import { CheckMenuItem, Menu, MenuItem } from '@tauri-apps/api/menu'
import { invoke } from '@tauri-apps/api/core'
import { atomWithStorage } from "jotai/utils"
import { useAtom } from "jotai"

const boxBackgroundColorAtom = atomWithStorage('boxBackgroundColor', '#00000000')
const autostartAtom = atomWithStorage('autostart', false)

function App() {

  const [boxBackgroundColor, ] = useAtom(boxBackgroundColorAtom);
  const [autostart, setAutostart] = useAtom(autostartAtom);

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

  getCurrent().setAlwaysOnTop(true);

  document.addEventListener("mousedown", async e => {
      if(e.button === 0)
        await getCurrent().startDragging();
  });

  async function open_context_menu(e: any) {

    const settingsItem = await MenuItem.new({enabled:true ,text: "Settings", action: () => {open_colorpicker()}});
    const autostartItem = await CheckMenuItem.new({checked: autostart, enabled: true , text: "Autostart", action: () => { toggle_autostart() }});
    const exitItem = await MenuItem.new({enabled:true ,text: "Exit", action: () => { getAll().forEach( window => { window.close(); }); }});

    const menu = await Menu.new({items: [ settingsItem, autostartItem, exitItem]});

    const position: PhysicalPosition = new PhysicalPosition(e.clientX, e.clientY);
    await menu.popup(position); 

  }

  return (
      <div onContextMenu={e => open_context_menu(e)} style={{ margin: '10px', backgroundColor: boxBackgroundColor }}>
        <FlipClock/>
      </div>
  );

}

export default App;

