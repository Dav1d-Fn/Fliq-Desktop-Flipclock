import "./styles.css";
import '@mantine/core/styles.css';
import "@pqina/flip/dist/flip.min.css";

import FlipClock from "./FlipClock";
import { window as tauriWindow } from "@tauri-apps/api";
import { invoke } from '@tauri-apps/api/tauri'
import { showMenu } from "tauri-plugin-context-menu";
import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";
// import { MantineProvider } from '@mantine/core';

const boxBackgroundColorAtom = atomWithStorage('boxBackgroundColor', '#00000000')

function App() {

  async function open_colorpicker() {
    await invoke("open_colorpicker_window") ; 
    console.log("Window was opened") ; 
  }

  tauriWindow.appWindow.setAlwaysOnTop(true);

  document.addEventListener("mousedown", async e => {
      await tauriWindow.appWindow.startDragging();
  });

  const handleClick = (e: React.MouseEvent) => {
    showMenu({ 
      items: [
          {
              label: "Background Color",
              disabled: false,
              event: () => {
                open_colorpicker();
              }
          }
      ]
    });
  };

  const [boxBackgroundColor, setboxBackgroundColor] = useAtom(boxBackgroundColorAtom);

  return (
    // <MantineProvider>
      <div onContextMenu={handleClick} style={{ margin: '30px', backgroundColor: boxBackgroundColor }}>
        <FlipClock/>
      </div>
    // </MantineProvider>
  );

}

export default App;
