import { createContext, useContext } from "react";
import type { PROJECT_LINKS } from "../../../tuxhub/projectLinks.ts";

export interface OverlayState
{
    // "native" on Windows and macOS, where there is no overlay mode to choose.
    mode: string;
    preference: string;
}

// What the settings pages need from outside the page itself. Fliq's own window asks Tauri
// (NativeSettingsHost); embedded in tuxhub the running clock answers over the socket
// (TuxhubSettingsHost). The settings themselves do not go through here: they are the atoms.
export interface SettingsHost
{
    // Shown inside tuxhub instead of in a window of its own.
    readonly embedded: boolean;
    version: () => Promise<string>;
    overlayState: () => Promise<OverlayState>;
    setOverlayMode: (mode: string) => Promise<void>;
    // Calls `listener` whenever the overlay mode changes outside this page; returns the
    // unsubscribe. Fliq's own window reloads instead, so it never calls.
    onOverlayChange: (listener: (state: OverlayState) => void) => () => void;
    resetAllSettings: () => Promise<void>;
    // Opens one of Fliq's own pages in the browser. Null where a plain link does that.
    readonly openLink: ((id: keyof typeof PROJECT_LINKS) => void) | null;
}

export const SettingsHostContext = createContext<SettingsHost | null>(null);

export function useSettingsHost(): SettingsHost
{
    const host = useContext(SettingsHostContext);
    if (!host)
    {
        throw new Error("SettingsHostContext is missing");
    }
    return host;
}
