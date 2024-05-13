import "@pqina/flip/dist/flip.min.css";
import "./styles.css";
import FlipClock from "./FlipClock";
import { window as tauriWindow } from "@tauri-apps/api";

function App() {

  tauriWindow.appWindow.setAlwaysOnTop(true);

  //const noDragSelector = "input, a, button"; // CSS selector
  document.addEventListener("mousedown", async e => {
      //if (e.target.closest(noDragSelector)) return; // a non-draggable element either in target or its ancestors
      await tauriWindow.appWindow.startDragging();
  });

  return (
    <div data-tauri-drag-region>
      <FlipClock/>
    </div>
  );
}

export default App;
