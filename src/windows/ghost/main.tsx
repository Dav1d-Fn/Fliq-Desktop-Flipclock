import "../../styles/styles.css";
import "@pqina/flip/dist/flip.min.css";

import { useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useAtomValue } from "jotai";
import GridClock from "../../clock/GridClock";
import { ATOMS } from "../../settings/atoms";

interface GhostPosition
{
    x: number;
    y: number;
    visible: boolean;
}

// Copy of the clock in a ghost window (one per output, created on the first drag). While the
// clock is dragged across a monitor border, the part on this output is drawn here; see
// ClockDragController. Settings reach it through the shared storage like any other window.
function Ghost()
{
    const layout = useAtomValue(ATOMS.CLOCK_LAYOUT);
    const scalePercent = useAtomValue(ATOMS.CLOCK_SCALE);
    const wrapper = useRef<HTMLDivElement>(null);

    useEffect(() =>
    {
        // Positioned imperatively, not through state: a re-render per pointer move is wasted
        // work. Listening on the own label only, otherwise every ghost would also receive the
        // events meant for the others.
        const label = getCurrentWebviewWindow().label;
        const unlisten = listen<GhostPosition>("ghost-pos", ({ payload }) =>
        {
            const element = wrapper.current;
            if (!element)
            {
                return;
            }
            element.style.transform = `translate(${payload.x}px, ${payload.y}px)`;
            element.style.visibility = payload.visible ? "visible" : "hidden";
        }, { target: label });

        return () =>
        {
            unlisten.then((stop) => stop()).catch(() => undefined);
        };
    }, []);

    return (
        <div ref={wrapper} style={{ position: "absolute", left: 0, top: 0, visibility: "hidden" }}>
            <GridClock layout={layout} scale={scalePercent / 100} />
        </div>
    );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<Ghost />);
