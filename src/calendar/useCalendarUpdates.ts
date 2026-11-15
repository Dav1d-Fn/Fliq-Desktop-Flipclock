import { useEffect } from "react";
import { useAtomValue, useStore } from "jotai";
import { ATOMS } from "../settings/atoms";
import { CalendarSync } from "./CalendarSync";

// How often the clock looks whether a calendar is due; the interval setting decides which are.
const CHECK_MS = 60 * 1000;

// Keeps ATOMS.CALENDAR_FEEDS fresh. Runs in the clock window only, like the weather; the other
// windows read the feeds through the shared storage.
export function useCalendarUpdates(): void
{
    const sources = useAtomValue(ATOMS.CALENDAR_SOURCES);
    const refreshMinutes = useAtomValue(ATOMS.CALENDAR_REFRESH_MINUTES);
    const store = useStore();
    // Only links and switches matter here, not names or colors.
    const sourcesKey = JSON.stringify(sources.map((source) => [source.id, source.url, source.enabled]));

    useEffect(() =>
    {
        const maxAgeMs = Math.max(1, refreshMinutes) * 60 * 1000;
        let running = false;
        const refresh = async () =>
        {
            if (running)
            {
                return;
            }
            running = true;
            await CalendarSync.refresh(store, maxAgeMs).finally(() =>
            {
                running = false;
            });
        };
        refresh();
        const intervalId = setInterval(refresh, CHECK_MS);
        return () => clearInterval(intervalId);
    }, [sourcesKey, refreshMinutes, store]);
}
