import type { HourCycle } from "../blocks/BlockDefinition.ts";
import { CALENDAR_DEFAULTS, type CalendarBlockSettings, type CalendarEvent, type CalendarFeed, type CalendarLayout, type CalendarSource } from "./CalendarTypes.ts";
import { EventFormatter } from "./EventFormatter.ts";
import { UpcomingEvents } from "./UpcomingEvents.ts";

// One line of a calendar block: dot color (null: no dot), icon emoji ("" for none), when, title.
export interface CalendarEntry
{
    color: string | null;
    icon: string;
    when: string;
    title: string;
}

// One day of the week strip: its letter and the colors of its dots (one per calendar).
export interface CalendarStripDay
{
    label: string;
    today: boolean;
    dots: string[];
}

// What a calendar block shows at `now`, ready to draw: shared by the clock and the
// settings window's previews.
export class CalendarEntries
{
    private readonly events: CalendarEvent[];
    private readonly sources: CalendarSource[];
    private readonly formatter: EventFormatter;
    private readonly now: Date;

    constructor(feeds: Record<string, CalendarFeed>, sources: CalendarSource[], now: Date, language: string, hourCycle: HourCycle)
    {
        this.events = Object.values(feeds).flatMap((feed) => feed.events);
        this.sources = sources;
        this.now = now;
        this.formatter = new EventFormatter(now, language, hourCycle);
    }

    // The next event (layout "next") or up to maxEntries of them.
    entries(settings: CalendarBlockSettings, layout: CalendarLayout): CalendarEntry[]
    {
        const limited = layout === "next" ? { ...settings, maxEntries: 1 } : settings;
        const timeStyle = settings.timeStyle ?? CALENDAR_DEFAULTS.timeStyle;
        const showDot = settings.colorDot ?? CALENDAR_DEFAULTS.colorDot;
        const showIcon = settings.icons ?? CALENDAR_DEFAULTS.icons;
        return UpcomingEvents.upcoming(this.events, this.sources, limited, this.now).map((event) => ({
            color: showDot ? this.colorOf(event.sourceId) : null,
            icon: showIcon ? EventFormatter.iconOf(event.title) : "",
            when: this.formatter.when(event, timeStyle),
            title: event.title,
        }));
    }

    // Seven days from the block's "today"; dots in the calendars' colors, or all in `plain`
    // when the color dots are off.
    week(settings: CalendarBlockSettings, plain: string): CalendarStripDay[]
    {
        const showColors = settings.colorDot ?? CALENDAR_DEFAULTS.colorDot;
        const today = UpcomingEvents.addDays(this.now, 0).getTime();
        return UpcomingEvents.weekStrip(this.events, this.sources, settings, this.now).map((day) =>
        {
            const sourceIds = [...new Set(day.events.map((event) => event.sourceId))];
            return {
                label: this.formatter.shortWeekday(day.start),
                today: day.start === today,
                dots: showColors ? sourceIds.map((sourceId) => this.colorOf(sourceId)) : sourceIds.length > 0 ? [plain] : [],
            };
        });
    }

    // The block in one line, for previews in dropdowns and member lists.
    plainText(settings: CalendarBlockSettings, layout: CalendarLayout, emptyText: string): string
    {
        if (layout === "week")
        {
            return this.week(settings, "").map((day) => (day.dots.length > 0 ? `${day.label}•` : day.label)).join(" ");
        }
        const entries = this.entries(settings, layout);
        if (entries.length === 0)
        {
            return settings.emptyText || emptyText;
        }
        return entries.map((entry) => [entry.icon, entry.when, entry.title].filter((part) => part !== "").join(" ")).join(" · ");
    }

    private colorOf(sourceId: string): string
    {
        return this.sources.find((source) => source.id === sourceId)?.color ?? "currentColor";
    }
}
