import "../../styles/styles.css";
import "@pqina/flip/dist/flip.min.css";

import { MouseEvent, useCallback, useEffect, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import { CheckMenuItem, Menu, MenuItem } from "@tauri-apps/api/menu";
import { isEnabled } from "@tauri-apps/plugin-autostart";
import { restoreStateCurrent, saveWindowState, StateFlags } from "@tauri-apps/plugin-window-state";

import GridClock from "../../clock/GridClock";
import { ClockDragController } from "../../overlay/ClockDragController";
import { ClockWindow } from "../../overlay/ClockWindow";
import { useWeatherUpdates } from "../../weather/useWeatherUpdates";
import { AppActions } from "../../settings/AppActions";
import { ATOMS } from "../../settings/atoms";
import { TuxhubBridge } from "../../tuxhub/TuxhubBridge";
import ClockMenu, { type ClockMenuItem } from "./ClockMenu";

// True while the native right-click menu is shown, see showNativeMenu.
let nativeMenuOpen = false;

function ClockApp()
{
    const [autostart, setAutostart] = useAtom(ATOMS.AUTOSTART);
    const [hideInTaskbar, setHideInTaskbar] = useAtom(ATOMS.HIDE_IN_TASKBAR);
    const [alwaysOnTop, setAlwaysOnTop] = useAtom(ATOMS.ALWAYS_ON_TOP);
    const layout = useAtomValue(ATOMS.CLOCK_LAYOUT);
    const scalePercent = useAtomValue(ATOMS.CLOCK_SCALE);
    // Where the HTML menu is open (layer-shell only), null while closed.
    const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
    const closeMenu = useCallback(() => setMenuAt(null), []);

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

    // Click area and window size follow the clock; the observer also fires once right away.
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
    }, []);

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

    // Click area grows with the menu and shrinks back once it is gone. Runs after the menu has
    // placed itself (its layout effect runs first).
    useEffect(() =>
    {
        ClockWindow.updateInputRegion();
    }, [menuAt]);

    const menuItems: ClockMenuItem[] = [
        { label: "Styling", action: () => void AppActions.openStyling() },
        { label: "Autostart", checked: autostart, action: () => void toggleAutostart() },
        { label: "Hide in Taskbar", checked: hideInTaskbar, action: () => void toggleHideInTaskbar() },
        { label: "Always on Top", checked: alwaysOnTop, action: () => void toggleAlwaysOnTop() },
        { label: "Exit", action: () => void AppActions.quit() },
    ];

    // Layer-shell: own HTML menu (see ClockMenu for why). X11 and Windows keep the native menu:
    // there the window is only as large as the clock, so an HTML menu would be cut off, and the
    // native popup gets a proper grab and closes on outside clicks.
    async function openContextMenu(event: MouseEvent)
    {
        const position = { x: event.clientX, y: event.clientY };
        if (await ClockWindow.isLayerShell())
        {
            setMenuAt(position);
            return;
        }
        await showNativeMenu(position);
    }

    async function showNativeMenu(position: { x: number; y: number })
    {
        // On GTK, popup() runs a nested main loop and holds Tauri's resource table until the menu
        // closes. Creating menu items in that time (a second right-click) waits for the same lock
        // on the same thread: the whole app freezes. So only one menu at a time.
        if (nativeMenuOpen)
        {
            return;
        }
        nativeMenuOpen = true;
        try
        {
            const items = await Promise.all(menuItems.map((item) => item.checked === undefined
                ? MenuItem.new({ text: item.label, action: item.action })
                : CheckMenuItem.new({ text: item.label, checked: item.checked, action: item.action })));
            const menu = await Menu.new({ items });
            await menu.popup(new PhysicalPosition(position.x, position.y));
        }
        finally
        {
            nativeMenuOpen = false;
        }
    }

    // The clock is hidden until the overlay state is known (set imperatively, like the
    // transform), otherwise it would flash in the top left corner of the output first.
    return (
        <>
            <div
                id="maindiv"
                style={{ position: "absolute", left: 0, top: 0, visibility: "hidden" }}
                onPointerDown={(event) =>
                {
                    // A left click on the clock closes the menu (and may start a drag as usual).
                    if (event.button === 0)
                    {
                        closeMenu();
                    }
                }}
                onContextMenu={(event) =>
                {
                    event.preventDefault();
                    event.stopPropagation();
                    void openContextMenu(event);
                }}
            >
                <GridClock layout={layout} scale={scalePercent / 100} />
            </div>
            {menuAt && <ClockMenu x={menuAt.x} y={menuAt.y} items={menuItems} onClose={closeMenu} />}
        </>
    );
}

export default ClockApp;
