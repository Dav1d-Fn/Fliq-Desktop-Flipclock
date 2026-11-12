import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";

export interface OverlayState
{
    mode: string;
    margin_x: number;
    margin_y: number;
    monitor: string | null;
}

// Global geometry of an output, as get_monitors returns it. The index in that list is also the
// index of the matching ghost window.
export interface Monitor
{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    scale: number;
}

const CLOCK_SELECTOR = "#flipclock-container";
const CLOCK_WRAPPER_ID = "maindiv";

// The clock's own window: overlay mode, click area, size and the clock's place in it.
export class ClockWindow
{
    // Asked once per page load. Rejects on Windows/macOS builds without the command.
    static readonly overlayState: Promise<OverlayState> = invoke<OverlayState>("get_overlay_state");

    static isLayerShell(): Promise<boolean>
    {
        return ClockWindow.overlayState.then((state) => state.mode === "layer-shell", () => false);
    }

    static wrapper(): HTMLElement | null
    {
        return document.getElementById(CLOCK_WRAPPER_ID);
    }

    static clockSize(): { width: number; height: number }
    {
        const rect = document.querySelector(CLOCK_SELECTOR)?.getBoundingClientRect();
        return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
    }

    // Only the clock takes clicks; the transparent rest of the window lets them through. On the
    // layer-shell path the window spans the whole output, elsewhere it cannot shrink below a GTK
    // minimum size; either way the empty area would block whatever lies underneath.
    static updateInputRegion(): void
    {
        const rect = document.querySelector(CLOCK_SELECTOR)?.getBoundingClientRect();
        if (!rect)
        {
            return;
        }
        invoke("set_input_region", {
            x: Math.floor(rect.left),
            y: Math.floor(rect.top),
            w: Math.ceil(rect.width),
            h: Math.ceil(rect.height),
        }).catch(() =>
        {
            // The command only exists on Linux; elsewhere the window has no such problem.
        });
    }

    // Position of the clock inside the full-output window (layer-shell path only).
    static placeClock(x: number, y: number): void
    {
        const wrapper = ClockWindow.wrapper();
        if (wrapper)
        {
            wrapper.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        }
        ClockWindow.updateInputRegion();
    }

    // Outside layer-shell the window is exactly as large as the clock.
    static async fitWindowToClock(): Promise<void>
    {
        if (await ClockWindow.isLayerShell())
        {
            return;
        }
        const { width, height } = ClockWindow.clockSize();
        if (width > 0 && height > 0)
        {
            await getCurrentWindow().setSize(new LogicalSize(width + 2, height + 2));
        }
    }

    static async fetchMonitors(): Promise<Monitor[]>
    {
        try
        {
            return await invoke<Monitor[]>("get_monitors");
        }
        catch (error)
        {
            console.error("get_monitors failed:", error);
            return [];
        }
    }
}

// Keeps a failed request from showing up as an unhandled rejection; every reader handles it.
ClockWindow.overlayState.catch(() => undefined);
