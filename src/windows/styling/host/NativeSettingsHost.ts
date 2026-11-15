import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { SettingsReset } from "../../../settings/SettingsReset";
import type { OverlayState, SettingsHost } from "./SettingsHost";

// The settings window of Fliq itself: everything comes from Tauri.
export class NativeSettingsHost implements SettingsHost
{
    readonly embedded = false;
    readonly openLink = null;

    version(): Promise<string>
    {
        return getVersion();
    }

    overlayState(): Promise<OverlayState>
    {
        return invoke<OverlayState>("get_overlay_state");
    }

    async setOverlayMode(mode: string): Promise<void>
    {
        await invoke("set_overlay_mode", { mode });
    }

    async resetAllSettings(): Promise<void>
    {
        await SettingsReset.resetAll();
        // The overlay mode select keeps its own copy of the Rust-side value; a reload drops it.
        window.location.reload();
    }
}
