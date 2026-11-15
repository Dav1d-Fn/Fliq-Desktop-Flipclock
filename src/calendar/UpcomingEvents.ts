import { CALENDAR_DEFAULTS, MAX_RANGE_DAYS, type CalendarBlockSettings, type CalendarEvent, type CalendarSource } from "./CalendarTypes.ts";

// The filter part of a block's settings: which events count at all.
export type EventFilter = Pick<CalendarBlockSettings, "sources" | "keywords" | "allDay">;

// One day of the week strip and the events touching it.
export interface StripDay
{
    start: number;
    events: CalendarEvent[];
}

// Which events a calendar block (or later the smart block) shows: filters, the day range,
// the evening switch. Pure; `now` comes from the caller.
export class UpcomingEvents
{
    // The events of all enabled sources a block picks, matching its keywords, sorted by start.
    static filtered(events: CalendarEvent[], sources: CalendarSource[], filter: EventFilter): CalendarEvent[]
    {
        const enabled = new Set(sources.filter((source) => source.enabled).map((source) => source.id));
        const picked = filter.sources;
        const terms = UpcomingEvents.keywordTerms(filter.keywords);
        const allDay = filter.allDay ?? CALENDAR_DEFAULTS.allDay;
        return events
            .filter((event) => enabled.has(event.sourceId))
            .filter((event) => !picked || picked.includes(event.sourceId))
            .filter((event) => allDay || !event.allDay)
            .filter((event) => UpcomingEvents.matches(event.title, terms))
            .sort(UpcomingEvents.byStart);
    }

    // The events a block lists at `now`: filtered, inside its range, at most maxEntries.
    static upcoming(events: CalendarEvent[], sources: CalendarSource[], settings: CalendarBlockSettings, now: Date): CalendarEvent[]
    {
        const { from, until } = UpcomingEvents.rangeOf(settings, now);
        const maxEntries = Math.max(1, settings.maxEntries ?? CALENDAR_DEFAULTS.maxEntries);
        return UpcomingEvents.filtered(events, sources, settings)
            .filter((event) => event.end > from && event.start < until || event.start === event.end && event.start >= from && event.start < until)
            .slice(0, maxEntries);
    }

    // Seven days from the block's first day (see firstDay), each with its filtered events.
    static weekStrip(events: CalendarEvent[], sources: CalendarSource[], settings: CalendarBlockSettings, now: Date): StripDay[]
    {
        const filtered = UpcomingEvents.filtered(events, sources, settings);
        const first = UpcomingEvents.firstDay(settings, now);
        return Array.from({ length: 7 }, (_, dayIndex) =>
        {
            const start = UpcomingEvents.addDays(first, dayIndex).getTime();
            const end = UpcomingEvents.addDays(first, dayIndex + 1).getTime();
            return { start, events: filtered.filter((event) => event.start < end && (event.end > start || event.start >= start)) };
        });
    }

    // Local midnight of the day the block calls "today": tomorrow once the evening switch's
    // hour has come.
    static firstDay(settings: CalendarBlockSettings, now: Date): Date
    {
        const today = UpcomingEvents.addDays(now, 0);
        const evening = settings.eveningHour;
        if (evening !== undefined && now.getHours() >= evening)
        {
            return UpcomingEvents.addDays(now, 1);
        }
        return today;
    }

    // [from, until) in ms. From now on today (running events still count), from midnight when
    // the evening switch moved "today" to tomorrow.
    static rangeOf(settings: CalendarBlockSettings, now: Date): { from: number; until: number }
    {
        const first = UpcomingEvents.firstDay(settings, now);
        const from = Math.max(now.getTime(), first.getTime());
        let days: number;
        switch (settings.range ?? CALENDAR_DEFAULTS.range)
        {
            case "today":
                days = 1;
                break;
            case "tomorrow":
                days = 2;
                break;
            case "week":
                // Until the end of Sunday (weeks start on Monday).
                days = 7 - (first.getDay() + 6) % 7;
                break;
            case "days":
                days = Math.min(MAX_RANGE_DAYS, Math.max(1, settings.days ?? CALENDAR_DEFAULTS.days));
                break;
        }
        return { from, until: UpcomingEvents.addDays(first, days).getTime() };
    }

    // "Müll, Tonne ,  " -> ["müll", "tonne"].
    static keywordTerms(keywords: string | undefined): string[]
    {
        return (keywords ?? "")
            .split(",")
            .map((term) => term.trim().toLocaleLowerCase())
            .filter((term) => term !== "");
    }

    static matches(title: string, terms: string[]): boolean
    {
        if (terms.length === 0)
        {
            return true;
        }
        const lower = title.toLocaleLowerCase();
        return terms.some((term) => lower.includes(term));
    }

    // Local midnight `days` days after the day of `date`.
    static addDays(date: Date, days: number): Date
    {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
    }

    // By start; on the same start all-day events first.
    private static byStart(first: CalendarEvent, second: CalendarEvent): number
    {
        return first.start - second.start || Number(second.allDay) - Number(first.allDay);
    }
}
