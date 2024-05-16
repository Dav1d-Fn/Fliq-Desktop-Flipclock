import "./styles.css"
import '@mantine/core/styles.css'
import "@pqina/flip/dist/flip.min.css"

import FlipClock from "./FlipClock"
import { PhysicalPosition, getCurrent, getAll } from '@tauri-apps/api/window'
import { Webview } from '@tauri-apps/api/webview';
import { Menu, MenuItem } from '@tauri-apps/api/menu'
import { invoke } from '@tauri-apps/api/core'
import { atomWithStorage } from "jotai/utils"
import { useAtom } from "jotai"

const boxBackgroundColorAtom = atomWithStorage('boxBackgroundColor', '#00000000')

function App() {

  async function open_colorpicker() {
    if(!Webview.getByLabel('Colorpicker'))
      await invoke("open_colorpicker_window") ; 
    console.log("Window was opened") ; 
  }

  getCurrent().setAlwaysOnTop(true);

  document.addEventListener("mousedown", async e => {
      if(e.button === 0)
        await getCurrent().startDragging();
  });

  async function open_context_menu(e: any) {

    const settingsItem = await MenuItem.new({enabled:true ,text: "Settings", action: () => {open_colorpicker()}});
    const exitItem = await MenuItem.new({enabled:true ,text: "Exit", action: () => { getAll().forEach( window => { window.close(); }); }});

    const menu = await Menu.new({items: [ settingsItem, exitItem ]});

    const position: PhysicalPosition = new PhysicalPosition(e.clientX, e.clientY);
    await menu.popup(position); 

  }

  const [boxBackgroundColor, setboxBackgroundColor] = useAtom(boxBackgroundColorAtom);

  return (
      <div onContextMenu={e => open_context_menu(e)} style={{ margin: '10px', backgroundColor: boxBackgroundColor }}>
        <FlipClock/>
      </div>
  );

}

export default App;

