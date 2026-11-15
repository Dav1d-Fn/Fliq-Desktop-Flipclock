import type { OverlayState, SettingsHost } from "../styling/host/SettingsHost";
import type { PROJECT_LINKS } from "../../tuxhub/projectLinks.ts";
import type { TuxhubPageBridge } from "./TuxhubPageBridge";

// The settings page embedded in tuxhub: the running clock answers over the socket.
export class TuxhubSettingsHost implements SettingsHost
{
    readonly embedded = true;
    private readonly bridge: TuxhubPageBridge;
    private readonly appVersion: string;
    private overlay: OverlayState;

    constructor(bridge: TuxhubPageBridge, appVersion: string, overlay: OverlayState)
    {
        this.bridge = bridge;
        this.appVersion = appVersion;
        this.overlay = overlay;
    }

    readonly openLink = (id: keyof typeof PROJECT_LINKS): void =>
    {
        this.bridge.call("links.open", { id }).catch((error) => console.error("Opening the link failed:", error));
    };

    version(): Promise<string>
    {
        return Promise.resolve(this.appVersion);
    }

    overlayState(): Promise<OverlayState>
    {
        return Promise.resolve(this.overlay);
    }

    async setOverlayMode(mode: string): Promise<void>
    {
        await this.bridge.call("settings.set", { key: "overlayMode", value: mode });
        this.overlay = { ...this.overlay, preference: mode };
    }

    // The clock resets and reports every changed value, so the page follows without a reload.
    async resetAllSettings(): Promise<void>
    {
        await this.bridge.call("settings.reset");
        this.overlay = { ...this.overlay, preference: "auto" };
    }
}
