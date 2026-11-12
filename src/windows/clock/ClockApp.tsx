import "../../styles/styles.css";
import "@pqina/flip/dist/flip.min.css";

import { MouseEvent, useEffect } from "react";
import { useAtom } from "jotai";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import { CheckMenuItem, Menu, MenuItem } from "@tauri-apps/api/menu";
import { isEnabled } from "@tauri-apps/plugin-autostart";
import { restoreStateCurrent, saveWindowState, StateFlags } from "@tauri-apps/plugin-window-state";

import FlipClock from "../../clock/FlipClock";
import { useClockLayoutKey } from "../../clock/useClockLayoutKey";
import { ClockDragController } from "../../overlay/ClockDragController";
import { ClockWindow } from "../../overlay/ClockWindow";
import { useWeatherUpdates } from "../../weather/useWeatherUpdates";
import { AppActions } from "../../settings/AppActions";
import { ATOMS } from "../../settings/atoms";
import { TuxhubBridge } from "../../tuxhub/TuxhubBridge";

function ClockApp()
{
    const [autostart, setAutostart] = useAtom(ATOMS.AUTOSTART);
    const [hideInTaskbar, setHideInTaskbar] = useAtom(ATOMS.HIDE_IN_TASKBAR);
    const [alwaysOnTop, setAlwaysOnTop] = useAtom(ATOMS.ALWAYS_ON_TOP);
    const [layoutKey, requestRebuild] = useClockLayoutKey();

    useWeatherUpdates();

    // Window flags and position, once per page load, with the values from storage.
    useEffect(() =>
    {
        const clockWindow = getCurrentWindow();
        clockWindow.setSkipTaskbar(hideInTaskbar)
            .then(() => clockWindow.setAlwaysOnTop(alwaysOnTop))
            .then(() => restoreStateCurrent(StateFlags.POSITION))
            .catch((error) => console.error("Window setup failed:", error));

        // The stored flag can drift from the real system entry (removed by hand, other build).
        isEnabled()
            .then(setAutostart)
            .catch(() => undefined);
    }, []);

    // Dragging, and saving the window position (X11/Windows/macOS).
    useEffect(() =>
    {
        const wrapper = ClockWindow.wrapper();
        const dragController = wrapper ? new ClockDragController(wrapper) : null;
        dragController?.start();

        const saveOnUnload = () =>
        {
            saveWindowState(StateFlags.POSITION);
        };
        window.addEventListener("beforeunload", saveOnUnload);

        return () =>
        {
            dragController?.dispose();
            window.removeEventListener("beforeunload", saveOnUnload);
            saveWindowState(StateFlags.POSITION);
        };
    }, []);

    // Settings page in tuxhub, if it is installed (src/tuxhub.ts).
    useEffect(() => TuxhubBridge.start(), []);

    // Click area and window size follow the clock. Re-attached per layout, because the container
    // remounts with the clock; the observer also fires once right away.
    useEffect(() =>
    {
        const container = document.querySelector("#flipclock-container");
        if (!container)
        {
            return;
        }
        const observer = new ResizeObserver(() =>
        {
            ClockWindow.updateInputRegion();
            ClockWindow.fitWindowToClock().catch((error) => console.error("Resizing the window failed:", error));
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, [layoutKey]);

    async function toggleAutostart()
    {
        await AppActions.setAutostart(!autostart);
        setAutostart(!autostart);
    }

    async function toggleHideInTaskbar()
    {
        await AppActions.setHideInTaskbar(!hideInTaskbar);
        setHideInTaskbar(!hideInTaskbar);
    }

    async function toggleAlwaysOnTop()
    {
        await AppActions.setAlwaysOnTop(!alwaysOnTop);
        setAlwaysOnTop(!alwaysOnTop);
    }

    async function openContextMenu(event: MouseEvent)
    {
        const items = await Promise.all([
            MenuItem.new({ text: "Styling", action: () => void AppActions.openStyling() }),
            CheckMenuItem.new({ checked: autostart, text: "Autostart", action: () => void toggleAutostart() }),
            CheckMenuItem.new({ checked: hideInTaskbar, text: "Hide in Taskbar", action: () => void toggleHideInTaskbar() }),
            CheckMenuItem.new({ checked: alwaysOnTop, text: "Always on Top", action: () => void toggleAlwaysOnTop() }),
            MenuItem.new({ text: "Exit", action: () => void AppActions.quit() }),
        ]);
        const menu = await Menu.new({ items });
        await menu.popup(new PhysicalPosition(event.clientX, event.clientY));
    }

    return (
        // Hidden until the overlay state is known (set imperatively, like the transform),
        // otherwise the clock would flash in the top left corner of the output first.
        <div
            id="maindiv"
            style={{ position: "absolute", left: 0, top: 0, visibility: "hidden" }}
            onContextMenu={(event) =>
            {
                event.preventDefault();
                event.stopPropagation();
                openContextMenu(event);
            }}
        >
            <FlipClock key={layoutKey} onLayoutChange={requestRebuild} />
        </div>
    );
}

export default ClockApp;
