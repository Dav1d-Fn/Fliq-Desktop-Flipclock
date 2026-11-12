import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { disable, enable } from "@tauri-apps/plugin-autostart";

// Actions with a side effect outside localStorage. Used by the clock's context menu and by the
// tuxhub interface, so both behave the same.
export class AppActions
{
    static async setAutostart(enabled: boolean): Promise<void>
    {
        if (enabled)
        {
            await enable();
        }
        else
        {
            await disable();
        }
    }

    static async setHideInTaskbar(hidden: boolean): Promise<void>
    {
        await getCurrentWindow().setSkipTaskbar(hidden);
    }

    static async setAlwaysOnTop(onTop: boolean): Promise<void>
    {
        await getCurrentWindow().setAlwaysOnTop(onTop);
    }

    static async openStyling(): Promise<void>
    {
        await invoke("open_stylingmenu_window");
    }

    // Ends the whole process. Closing all windows was not enough: hidden ghost windows and the
    // window list could keep it alive.
    static async quit(): Promise<void>
    {
        await invoke("quit_app");
    }
}
