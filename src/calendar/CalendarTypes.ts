// Calendars: the sources set up under Data › Calendar, the events read from them, and what a
// calendar block shows. Shapes only.

// One calendar, added by its secret ICS link. The link is a secret: it stays in localStorage
// and is never logged or shown outside its own input.
export interface CalendarSource
{
    id: string;
    name: string;
    url: string;
    color: string;
    enabled: boolean;
}

// One occurrence of an event (recurring events are expanded). Times in ms since the epoch; an
// all-day event runs from local midnight to local midnight (end exclusive).
export interface CalendarEvent
{
    sourceId: string;
    title: string;
    start: number;
    end: number;
    allDay: boolean;
}

// What the last good download of a source gave, kept so the block works offline. `error` is
// the code of the last failed download (the events stay those of the last good one).
export interface CalendarFeed
{
    events: CalendarEvent[];
    // When the events were downloaded (ms); 0 when never.
    updatedAt: number;
    // Last download attempt (ms), good or not; a broken link is retried at the normal interval.
    checkedAt?: number;
    error?: string;
}

// Which days a block looks at: the rest of today, today and tomorrow, until Sunday, or the
// next `days` days (today counts as the first).
export type CalendarRange = "today" | "tomorrow" | "week" | "days";

// How a block tells when: "in 2 h" / "tomorrow", the weekday, or weekday and time.
export type CalendarTimeStyle = "relative" | "weekday" | "time";

// The block's display: the next event on one line, a list, or the week with dots on busy days.
export type CalendarLayout = "next" | "list" | "week";

// What a calendar block shows (LayoutBlock.calendar); unset fields take CALENDAR_DEFAULTS.
export interface CalendarBlockSettings
{
    // Ids of the sources it shows; unset means all.
    sources?: string[];
    // Comma-separated terms, at least one must be in the title (case-insensitive); empty: all.
    keywords?: string;
    range?: CalendarRange;
    days?: number;
    maxEntries?: number;
    // From this hour on, "today" means tomorrow (the bins go out the evening before). Unset: off.
    eveningHour?: number;
    timeStyle?: CalendarTimeStyle;
    allDay?: boolean;
    icons?: boolean;
    colorDot?: boolean;
    // Shown when nothing matches; unset: the language's "Nothing planned".
    emptyText?: string;
}

export const CALENDAR_DEFAULTS = {
    range: "days" as CalendarRange,
    days: 7,
    maxEntries: 3,
    timeStyle: "relative" as CalendarTimeStyle,
    allDay: true,
    icons: true,
    colorDot: true,
    refreshMinutes: 15,
};

// Days around the download that are kept: one back (events still running), and enough ahead
// for the longest range plus the evening switch.
export const FEED_DAYS_BEHIND = 1;
export const FEED_DAYS_AHEAD = 40;
export const MAX_RANGE_DAYS = 31;
