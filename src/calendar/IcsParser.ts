import ICAL from "ical.js";
import type { CalendarEvent } from "./CalendarTypes.ts";

// Safety stop for one recurring event, e.g. an every-minute rule from decades ago.
const MAX_OCCURRENCES = 100000;

// What one ICS file holds within a window.
export interface ParsedCalendar
{
    // X-WR-CALNAME, the name the calendar has at its provider; empty when it has none.
    name: string;
    events: CalendarEvent[];
}

// Reads ICS text (RFC 5545) with ical.js: expands recurring events (RRULE, RDATE, EXDATE and
// moved or changed occurrences) and keeps the occurrences that overlap [windowStart, windowEnd).
// Times with a TZID are converted with the VTIMEZONE the file brings.
export class IcsParser
{
    // Throws "not-ics" when the text is no calendar.
    static parse(text: string, sourceId: string, windowStart: number, windowEnd: number): ParsedCalendar
    {
        if (!text.includes("BEGIN:VCALENDAR"))
        {
            throw new Error("not-ics");
        }
        let calendar: ICAL.Component;
        try
        {
            calendar = new ICAL.Component(ICAL.parse(text));
        }
        catch
        {
            throw new Error("not-ics");
        }

        // ponytail: a TZID without its VTIMEZONE in the file is read as local time. Add a
        // zone database if a provider leaves them out.
        for (const timezone of calendar.getAllSubcomponents("vtimezone"))
        {
            ICAL.TimezoneService.register(timezone);
        }

        // Moved or changed occurrences (RECURRENCE-ID) belong to their series, by UID.
        const series = new Map<string, ICAL.Event>();
        const exceptions: ICAL.Event[] = [];
        const singles: ICAL.Event[] = [];
        for (const component of calendar.getAllSubcomponents("vevent"))
        {
            const event = new ICAL.Event(component);
            if (event.isRecurrenceException())
            {
                exceptions.push(event);
            }
            else if (event.isRecurring())
            {
                series.set(event.uid, event);
            }
            else
            {
                singles.push(event);
            }
        }
        for (const exception of exceptions)
        {
            const master = series.get(exception.uid);
            if (master)
            {
                master.relateException(exception);
            }
            else
            {
                // An occurrence whose series is not in the file stands on its own.
                singles.push(exception);
            }
        }

        const events: CalendarEvent[] = [];
        const keep = (title: string, startDate: ICAL.Time, endDate: ICAL.Time | null) =>
        {
            const allDay = startDate.isDate;
            const start = startDate.toJSDate().getTime();
            let end = endDate ? endDate.toJSDate().getTime() : start;
            if (end <= start)
            {
                // No end, or an empty one: an all-day event lasts its day, a timed one is a moment.
                end = allDay ? IcsParser.nextLocalMidnight(start) : start;
            }
            const overlaps = end > windowStart && start < windowEnd || start === end && start >= windowStart && start < windowEnd;
            if (overlaps)
            {
                events.push({ sourceId, title: title.trim(), start, end, allDay });
            }
        };

        for (const event of singles)
        {
            keep(event.summary ?? "", event.startDate, event.endDate);
        }
        for (const event of series.values())
        {
            const iterator = event.iterator();
            for (let count = 0; count < MAX_OCCURRENCES; count++)
            {
                const next = iterator.next();
                if (!next || next.toJSDate().getTime() >= windowEnd)
                {
                    break;
                }
                const details = event.getOccurrenceDetails(next);
                keep(details.item.summary ?? "", details.startDate, details.endDate);
            }
        }

        events.sort((first, second) => first.start - second.start);
        const name = calendar.getFirstPropertyValue("x-wr-calname");
        return { name: typeof name === "string" ? name.trim() : "", events };
    }

    // Local midnight after `time` (days are not always 24 h long, so via Date).
    private static nextLocalMidnight(time: number): number
    {
        const date = new Date(time);
        date.setDate(date.getDate() + 1);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    }
}
