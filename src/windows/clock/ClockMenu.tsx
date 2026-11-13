import { useEffect, useLayoutEffect, useRef } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export interface ClockMenuItem
{
    label: string;
    // Shown as a check mark; undefined for plain entries.
    checked?: boolean;
    action: () => void;
}

interface ClockMenuProps
{
    // Viewport position of the right-click.
    x: number;
    y: number;
    items: ClockMenuItem[];
    onClose: () => void;
}

export const CLOCK_MENU_ID = "clock-menu";

// Clicks outside the clock surface never reach the webview, and WebKitGTK reports no mouseout
// when the pointer leaves the click area (clock + menu). Rust passes GTK's leave on as
// `pointer-left`; the menu closes after this short grace for wobbling across the edge.
const SURFACE_LEAVE_GRACE_MS = 150;

// Fallback: closes this long after the last pointer move on the surface. Moves only arrive while
// the pointer is on the clock or the menu, so this always runs out once it is gone.
const IDLE_CLOSE_MS = 4000;

// The clock's right-click menu, drawn in the clock webview (layer-shell mode only).
//
// The native GTK popup cannot be used there: on a layer-shell surface its xdg_popup gets no valid
// grab, an outside click never dismisses it, and its nested main loop blocks the whole app.
// Fixed pixel size, not scaled with the clock, so it stays readable at any clock scale.
function ClockMenu({ x, y, items, onClose }: ClockMenuProps)
{
    const menuRef = useRef<HTMLDivElement>(null);
    // Keeps the menu on screen: the surface is the whole output, so near its right or bottom edge
    // the menu opens to the other side of the pointer.
    useLayoutEffect(() =>
    {
        const menu = menuRef.current;
        if (!menu)
        {
            return;
        }
        const width = menu.offsetWidth;
        const height = menu.offsetHeight;
        const left = x + width > window.innerWidth ? Math.max(0, x - width) : x;
        const top = y + height > window.innerHeight ? Math.max(0, y - height) : y;
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.style.visibility = "visible";
    }, [x, y]);

    useEffect(() =>
    {
        let idleTimer = window.setTimeout(onClose, IDLE_CLOSE_MS);
        let leaveTimer: number | undefined;

        // Any move proves the pointer is still on the surface.
        const keepOpen = () =>
        {
            window.clearTimeout(idleTimer);
            window.clearTimeout(leaveTimer);
            idleTimer = window.setTimeout(onClose, IDLE_CLOSE_MS);
        };
        const closeOnEscape = (event: KeyboardEvent) =>
        {
            if (event.key === "Escape")
            {
                onClose();
            }
        };
        document.addEventListener("mousemove", keepOpen);
        window.addEventListener("keydown", closeOnEscape);
        const stopListening = getCurrentWebviewWindow().listen("pointer-left", () =>
        {
            window.clearTimeout(leaveTimer);
            leaveTimer = window.setTimeout(onClose, SURFACE_LEAVE_GRACE_MS);
        });

        return () =>
        {
            window.clearTimeout(idleTimer);
            window.clearTimeout(leaveTimer);
            document.removeEventListener("mousemove", keepOpen);
            window.removeEventListener("keydown", closeOnEscape);
            stopListening.then((unlisten) => unlisten()).catch(() => undefined);
        };
    }, [x, y, onClose]);

    return (
        <div
            id={CLOCK_MENU_ID}
            ref={menuRef}
            className="clock-menu"
            role="menu"
            style={{ left: x, top: y, visibility: "hidden" }}
            onContextMenu={(event) => event.preventDefault()}
        >
            {items.map((item) => (
                <button
                    key={item.label}
                    type="button"
                    role={item.checked === undefined ? "menuitem" : "menuitemcheckbox"}
                    aria-checked={item.checked}
                    className="clock-menu-item"
                    onClick={() =>
                    {
                        onClose();
                        item.action();
                    }}
                >
                    <span className="clock-menu-check">{item.checked ? "✓" : ""}</span>
                    {item.label}
                </button>
            ))}
        </div>
    );
}

export default ClockMenu;
