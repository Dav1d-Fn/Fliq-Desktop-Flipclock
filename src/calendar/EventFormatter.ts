import type { HourCycle } from "../blocks/BlockDefinition.ts";
import type { CalendarEvent, CalendarTimeStyle } from "./CalendarTypes.ts";
import { UpcomingEvents } from "./UpcomingEvents.ts";

// Emoji shown before a title containing one of the terms (lower case). Flat icons for them are
// in FlatWeatherIcons, like the weather's.
const KEYWORD_ICONS: [string, string[]][] = [
    ["🗑️", ["müll", "tonne", "abfall", "papier", "gelber sack", "wertstoff", "trash", "garbage", "waste", "recycling", "bin day"]],
    ["🎂", ["geburtstag", "birthday", "bday"]],
    ["🩺", ["arzt", "ärztin", "praxis", "doctor", "dentist"]],
    ["✈️", ["flug", "flight"]],
    ["🏖️", ["urlaub", "ferien", "vacation", "holiday"]],
];

const HOUR_MS = 60 * 60 * 1000;

// When an event happens, as the block says it, and its icon. Pure, `now` and the language
// come from the caller.
export class EventFormatter
{
    private readonly now: Date;
    private readonly language: string;
    private readonly hourCycle: HourCycle;
    private readonly relative: Intl.RelativeTimeFormat;

    constructor(now: Date, language: string, hourCycle: HourCycle)
    {
        this.now = now;
        this.language = language;
        this.hourCycle = hourCycle;
        this.relative = new Intl.RelativeTimeFormat(language, { numeric: "auto", style: "short" });
    }

    static iconOf(title: string): string
    {
        const lower = title.toLocaleLowerCase();
        return KEYWORD_ICONS.find(([, terms]) => terms.some((term) => lower.includes(term)))?.[0] ?? "";
    }

    // relative: "now", "in 25 min", "in 2 hr", "today" (all day), "tomorrow", "in 3 days".
    // weekday: "Wed". time: "07:00" today, "Wed 07:00" on other days (all-day: like weekday).
    when(event: CalendarEvent, style: CalendarTimeStyle): string
    {
        const dayOffset = this.dayOffset(event.start);
        if (style === "weekday")
        {
            return this.weekday(event.start);
        }
        if (style === "time")
        {
            if (event.allDay)
            {
                return dayOffset <= 0 ? this.relative.format(0, "day") : this.weekday(event.start);
            }
            return dayOffset === 0 ? this.time(event.start) : `${this.weekday(event.start)} ${this.time(event.start)}`;
        }
        if (event.start <= this.now.getTime())
        {
            return event.allDay ? this.relative.format(0, "day") : this.relative.format(0, "second");
        }
        if (!event.allDay && dayOffset === 0)
        {
            const minutes = Math.round((event.start - this.now.getTime()) / 60000);
            return minutes < 60 ? this.relative.format(minutes, "minute") : this.relative.format(Math.round(minutes * 60000 / HOUR_MS), "hour");
        }
        return this.relative.format(dayOffset, "day");
    }

    // "Mo", "Tu" … in the date language, for the week strip.
    shortWeekday(time: number): string
    {
        return new Intl.DateTimeFormat(this.language, { weekday: "narrow" }).format(new Date(time));
    }

    // Calendar days from today to the day of `time` (0 today, 1 tomorrow).
    private dayOffset(time: number): number
    {
        const today = UpcomingEvents.addDays(this.now, 0);
        const day = UpcomingEvents.addDays(new Date(time), 0);
        return Math.round((day.getTime() - today.getTime()) / (24 * HOUR_MS));
    }

    private weekday(time: number): string
    {
        // "Mi." -> "Mi": the short German names carry a period the clock does not need.
        return new Intl.DateTimeFormat(this.language, { weekday: "short" }).format(new Date(time)).replace(/\.$/, "");
    }

    private time(time: number): string
    {
        const twelveHour = this.hourCycle === "12";
        return new Intl.DateTimeFormat(this.language, { hour: twelveHour ? "numeric" : "2-digit", minute: "2-digit", hour12: twelveHour }).format(new Date(time));
    }
}
