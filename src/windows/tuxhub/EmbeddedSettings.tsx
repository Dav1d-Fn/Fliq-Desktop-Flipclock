import { useEffect, useState } from "react";
import type { SettingsHost } from "../styling/host/SettingsHost";
import StylingApp from "../styling/StylingApp";
import type { TuxhubPageBridge } from "./TuxhubPageBridge";

interface EmbeddedSettingsProps
{
    bridge: TuxhubPageBridge;
    host: SettingsHost;
    // tuxhub's appearance when the page starts, and every change of it afterwards.
    initiallyDark: boolean;
    onTheme: (listener: (dark: boolean) => void) => () => void;
    // Calls `listener` with the message of every value Fliq refused; returns the unsubscribe.
    onRefusal: (listener: (message: string) => void) => () => void;
}

// How long a refusal stays on screen.
const REFUSAL_VISIBLE_MS = 5000;

// Fliq's settings inside tuxhub: the same StylingApp as in Fliq's own window, in tuxhub's
// light or dark appearance, with the two things only this place needs: a note for a value Fliq
// refused, and a cover once Fliq is gone.
export function EmbeddedSettings({ bridge, host, initiallyDark, onTheme, onRefusal }: EmbeddedSettingsProps)
{
    const [dark, setDark] = useState(initiallyDark);
    const [closed, setClosed] = useState(false);
    const [refusal, setRefusal] = useState<string | null>(null);

    useEffect(() => onTheme(setDark), [onTheme]);

    useEffect(() => bridge.on("closed", () => setClosed(true)), [bridge]);

    useEffect(() => onRefusal(setRefusal), [onRefusal]);

    useEffect(() =>
    {
        if (refusal === null)
        {
            return undefined;
        }
        const timer = window.setTimeout(() => setRefusal(null), REFUSAL_VISIBLE_MS);
        return () => window.clearTimeout(timer);
    }, [refusal]);

    return (
        <>
            <StylingApp host={host} colorScheme={dark ? "dark" : "light"} />
            {refusal !== null && <div className="embedded-note" role="alert">{refusal}</div>}
            {closed && (
                <div className="embedded-cover" role="alert">
                    Fliq is no longer running.
                </div>
            )}
        </>
    );
}
