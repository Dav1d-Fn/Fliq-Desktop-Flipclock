import ReactDOM from "react-dom/client";
import { SettingsStorage } from "../../settings/SettingsStorage";
import { RemoteSettingsBackend } from "../../tuxhub/RemoteSettingsBackend.ts";
import type { OverlayState } from "../styling/host/SettingsHost";
import "./TuxhubPageBridge";
import "./embedded.css";
import { TuxhubSettingsHost } from "./TuxhubSettingsHost";

// Answer of the clock to `settings.get`.
interface ClockSettings
{
    values: Record<string, unknown>;
    overlay: OverlayState;
    version: string;
}

function showMessage(text: string): void
{
    const root = document.getElementById("colorpicker-root") as HTMLElement;
    root.textContent = text;
    root.className = "embedded-message";
}

function asRecord(value: unknown): Record<string, unknown>
{
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

// Entry of Fliq's settings page inside tuxhub. The page has no storage and no Tauri: it loads
// the running clock's settings over tuxhub's bridge, points the settings atoms at that copy
// and only then loads the settings UI, so no atom is created against localStorage.
async function start(): Promise<void>
{
    const bridge = window.tuxhub;
    if (!bridge)
    {
        showMessage("This page is Fliq's settings for tuxhub. Open Fliq in tuxhub to use it.");
        return;
    }

    // tuxhub reports its appearance once, right when the page announces itself, and again on
    // every change. Listening starts here, before anything is awaited, so the first report is
    // not missed; until it arrives the desktop's own preference stands in.
    let dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const themeListeners = new Set<(dark: boolean) => void>();
    bridge.on("theme", (params) =>
    {
        dark = asRecord(params).dark === true;
        themeListeners.forEach((listener) => listener(dark));
    });

    const settings = await bridge.call("settings.get") as ClockSettings;
    // Lets the styles drop the page's own background: it sits on tuxhub's.
    document.documentElement.classList.add("fliq-embedded");

    const refusalListeners = new Set<(message: string) => void>();
    const backend = new RemoteSettingsBackend(
        {
            set: async (key, value) => asRecord(await bridge.call("settings.set", { key, value })).value,
        },
        (_key, message) => refusalListeners.forEach((listener) => listener(message)),
    );
    backend.load(settings.values);
    SettingsStorage.useRemote(backend);
    bridge.on("settings-changed", (params) => backend.applyRemote(asRecord(asRecord(params).values)));

    const host = new TuxhubSettingsHost(bridge, settings.version, settings.overlay);
    const { EmbeddedSettings } = await import("./EmbeddedSettings");

    function onRefusal(listener: (message: string) => void): () => void
    {
        refusalListeners.add(listener);
        return () =>
        {
            refusalListeners.delete(listener);
        };
    }

    function onTheme(listener: (dark: boolean) => void): () => void
    {
        themeListeners.add(listener);
        return () =>
        {
            themeListeners.delete(listener);
        };
    }

    ReactDOM.createRoot(document.getElementById("colorpicker-root") as HTMLElement).render(
        <EmbeddedSettings bridge={bridge} host={host} initiallyDark={dark} onTheme={onTheme} onRefusal={onRefusal} />
    );
}

start().catch((error) =>
{
    console.error("Fliq settings for tuxhub failed to start:", error);
    showMessage("Fliq's settings could not be loaded. Is Fliq still running?");
});
