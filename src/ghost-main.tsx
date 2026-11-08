import "./styles/styles.css";
import "@mantine/core/styles.css";
import "@pqina/flip/dist/flip.min.css";

import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { useAtom } from "jotai";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import FlipClock from "./pages/FlipClock";
import { ATOMS } from "./pages/atoms";

// Copy of the clock in a ghost window (one per output). While the clock is dragged across a
// monitor border, the part on this output is drawn here; see the drag code in App.tsx.
function Ghost() {
  const [format] = useAtom(ATOMS.TIME_FORMAT);
  const [secondRowTimeFormat] = useAtom(ATOMS.SECOND_ROW_TIME_FORMAT);
  const [key, setKey] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Positioned imperatively, not through state: a re-render per pointer move would rebuild
    // the clock's spans under Tick.js.
    //
    // With the own label as target, otherwise every ghost would also receive the events meant
    // for the others.
    const label = getCurrentWebviewWindow().label;
    const unlisten = listen<{ x: number; y: number; visible: boolean }>("ghost-pos", ({ payload: p }) => {
      const el = wrapper.current;
      if (!el) return;
      el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      el.style.visibility = p.visible ? "visible" : "hidden";
    }, { target: label });

    // Settings changed in the styling window arrive as storage events; rebuild like App does.
    const rebuild = () => setKey((k) => k + 1);
    window.addEventListener("storage", rebuild);
    return () => {
      unlisten.then((f) => f()).catch(() => {});
      window.removeEventListener("storage", rebuild);
    };
  }, []);

  return (
    <div ref={wrapper} style={{ position: "absolute", left: 0, top: 0, visibility: "hidden" }}>
      <FlipClock
        key={key}
        format={format}
        secondRowTimeFormat={secondRowTimeFormat}
        fetchWeather={false}
        onLayoutChange={() => setKey((k) => k + 1)}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<Ghost />);
