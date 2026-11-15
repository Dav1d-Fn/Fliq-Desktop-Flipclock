import { invoke } from "@tauri-apps/api/core";
import type { createStore } from "jotai";
import { ATOMS } from "../settings/atoms";
import { FEED_DAYS_AHEAD, FEED_DAYS_BEHIND, type CalendarFeed, type CalendarSource } from "./CalendarTypes";
import { IcsParser, type ParsedCalendar } from "./IcsParser";
import { UpcomingEvents } from "./UpcomingEvents";

type Store = ReturnType<typeof createStore>;

// Downloads and reads the calendars, and keeps ATOMS.CALENDAR_FEEDS up to date. Error codes:
// "invalid-url", "offline", "http-<status>", "too-large", "not-text" (Rust side), "not-ics".
// Errors never carry the link: it is a secret.
export class CalendarSync
{
    // The source's events in the kept window around now.
    static async load(url: string, sourceId: string, now = new Date()): Promise<ParsedCalendar>
    {
        const text = await CalendarSync.fetchText(url);
        const windowStart = UpcomingEvents.addDays(now, -FEED_DAYS_BEHIND).getTime();
        const windowEnd = UpcomingEvents.addDays(now, FEED_DAYS_AHEAD).getTime();
        return IcsParser.parse(text, sourceId, windowStart, windowEnd);
    }

    // Puts a freshly loaded calendar into the cache (the settings page after checking a link).
    static store(store: Store, sourceId: string, events: ParsedCalendar["events"]): void
    {
        const feed: CalendarFeed = { events, updatedAt: Date.now(), checkedAt: Date.now() };
        store.set(ATOMS.CALENDAR_FEEDS, (feeds) => ({ ...feeds, [sourceId]: feed }));
    }

    // Fetches every enabled source (or only those older than `maxAgeMs`). A failed one keeps
    // its last good events and notes the error. Feeds of removed sources are dropped.
    static async refresh(store: Store, maxAgeMs = 0): Promise<void>
    {
        const sources = store.get(ATOMS.CALENDAR_SOURCES);
        const known = store.get(ATOMS.CALENDAR_FEEDS);
        const due = sources.filter((source) => source.enabled && Date.now() - (known[source.id]?.checkedAt ?? known[source.id]?.updatedAt ?? 0) >= maxAgeMs);
        const results = await Promise.all(due.map(async (source) => [source.id, await CalendarSync.attempt(source)] as const));
        if (results.length === 0 && Object.keys(known).every((id) => sources.some((source) => source.id === id)))
        {
            return;
        }

        store.set(ATOMS.CALENDAR_FEEDS, (feeds) =>
        {
            const next: Record<string, CalendarFeed> = {};
            for (const source of store.get(ATOMS.CALENDAR_SOURCES))
            {
                if (feeds[source.id])
                {
                    next[source.id] = feeds[source.id];
                }
            }
            for (const [sourceId, result] of results)
            {
                if (!store.get(ATOMS.CALENDAR_SOURCES).some((source) => source.id === sourceId))
                {
                    continue;
                }
                next[sourceId] = typeof result === "string"
                    ? { events: feeds[sourceId]?.events ?? [], updatedAt: feeds[sourceId]?.updatedAt ?? 0, checkedAt: Date.now(), error: result }
                    : { events: result.events, updatedAt: Date.now(), checkedAt: Date.now() };
            }
            return next;
        });
    }

    // The error code of an Error from load, or "offline" for anything unexpected.
    static errorCode(error: unknown): string
    {
        const code = error instanceof Error ? error.message : typeof error === "string" ? error : "";
        return /^(invalid-url|offline|http-\d+|too-large|not-text|not-ics)$/.test(code) ? code : "offline";
    }

    private static async attempt(source: CalendarSource): Promise<ParsedCalendar | string>
    {
        try
        {
            return await CalendarSync.load(source.url, source.id);
        }
        catch (error)
        {
            const code = CalendarSync.errorCode(error);
            console.error(`Calendar "${source.name}" could not be loaded: ${code}`);
            return code;
        }
    }

    // Through Rust in the app (the hosts do not allow the webview's origin). In a plain browser
    // (vite during development) fetch, which works for same-origin test files.
    private static async fetchText(url: string): Promise<string>
    {
        if ("__TAURI_INTERNALS__" in window)
        {
            try
            {
                return await invoke<string>("fetch_calendar", { url });
            }
            catch (error)
            {
                throw new Error(CalendarSync.errorCode(error));
            }
        }
        let response: Response;
        try
        {
            response = await fetch(url);
        }
        catch
        {
            throw new Error("offline");
        }
        if (!response.ok)
        {
            throw new Error(`http-${response.status}`);
        }
        return response.text();
    }
}
