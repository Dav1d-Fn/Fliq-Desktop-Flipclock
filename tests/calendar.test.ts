// Runs with `npm test` (node --test, no extra dependency).
// Times below are Berlin wall-clock times; the fixture's events use Europe/Berlin.
process.env.TZ = "Europe/Berlin";

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { IcsParser } from "../src/calendar/IcsParser.ts";
import { UpcomingEvents } from "../src/calendar/UpcomingEvents.ts";
import { EventFormatter } from "../src/calendar/EventFormatter.ts";
import type { CalendarSource } from "../src/calendar/CalendarTypes.ts";

const ics = readFileSync(new URL("./fixtures/sample.ics", import.meta.url), "utf8");
const at = (day: number, hours = 0, minutes = 0, month = 10) => new Date(2026, month, day, hours, minutes);
const windowStart = at(14).getTime();
const windowEnd = at(14, 0, 0, 11).getTime(); // 14 Dec
const parsed = IcsParser.parse(ics, "home", windowStart, windowEnd);
const sources: CalendarSource[] = [{ id: "home", name: "Privat", url: "", color: "#f00", enabled: true }];
const titled = (title: string) => parsed.events.filter((event) => event.title === title);

test("reads the calendar name", () =>
{
    assert.equal(parsed.name, "Privat");
});

test("refuses text that is no calendar", () =>
{
    assert.throws(() => IcsParser.parse("<html>Sign in</html>", "x", 0, 1), /not-ics/);
});

test("expands weekly events in the window, with EXDATE and moved occurrences", () =>
{
    const days = titled("Restmüll").map((event) => new Date(event.start).getDate());
    // Wednesdays 18 Nov, (25 Nov excluded), (2 Dec moved), 9 Dec.
    assert.deepEqual(days, [18, 9]);
    const moved = titled("Restmüll (verschoben)");
    assert.equal(moved.length, 1);
    assert.equal(moved[0].start, at(3, 7, 0, 11).getTime());
});

test("converts TZID times with the file's VTIMEZONE", () =>
{
    // 07:00 in Berlin, whatever the zone the test machine is in.
    assert.equal(titled("Restmüll")[0].start, Date.UTC(2026, 10, 18, 6, 0));
    assert.equal(titled("Zahnarzt")[0].start, Date.UTC(2026, 10, 16, 9, 0));
});

test("all-day events run from local midnight to midnight, also without DTEND", () =>
{
    const birthday = titled("Geburtstag Oma");
    assert.equal(birthday.length, 1);
    assert.equal(birthday[0].allDay, true);
    assert.equal(birthday[0].start, at(20).getTime());
    assert.equal(birthday[0].end, at(21).getTime());
});

test("COUNT ends a series", () =>
{
    assert.equal(titled("Standup").length, 3);
});

test("keyword filter is case-insensitive and takes several terms", () =>
{
    const titles = UpcomingEvents.filtered(parsed.events, sources, { keywords: "MÜLL, tonne" }).map((event) => event.title);
    assert.ok(titles.length > 0);
    assert.ok(titles.every((title) => /müll|tonne/i.test(title)));
    assert.deepEqual(UpcomingEvents.keywordTerms(" a, ,B "), ["a", "b"]);
});

test("disabled and unpicked sources are left out", () =>
{
    assert.equal(UpcomingEvents.filtered(parsed.events, [{ ...sources[0], enabled: false }], {}).length, 0);
    assert.equal(UpcomingEvents.filtered(parsed.events, sources, { sources: ["other"] }).length, 0);
});

test("all-day events can be hidden", () =>
{
    assert.ok(UpcomingEvents.filtered(parsed.events, sources, { allDay: false }).every((event) => !event.allDay));
});

test("range today ends at midnight, keeps running events, drops ended ones", () =>
{
    // Monday 16 Nov 09:40: Zahnarzt runs (10:00-11:00 local), Standup 09:30-09:45 runs.
    const titles = UpcomingEvents.upcoming(parsed.events, sources, { range: "today", maxEntries: 10 }, at(16, 9, 40)).map((event) => event.title);
    assert.deepEqual(titles, ["Standup", "Zahnarzt"]);
    const later = UpcomingEvents.upcoming(parsed.events, sources, { range: "today", maxEntries: 10 }, at(16, 12)).map((event) => event.title);
    assert.deepEqual(later, []);
});

test("range tomorrow, this week and next days", () =>
{
    const titles = (range: "tomorrow" | "week" | "days", now: Date, days?: number) =>
        UpcomingEvents.upcoming(parsed.events, sources, { range, days, keywords: "müll", maxEntries: 10 }, now).map((event) => new Date(event.start).getDate());
    // Tuesday 17 Nov: tomorrow is Wednesday's Restmüll.
    assert.deepEqual(titles("tomorrow", at(17, 8)), [18]);
    // Thursday 19 Nov: nothing left this week (until Sunday 22 Nov).
    assert.deepEqual(titles("week", at(19, 8)), []);
    // Monday 16 Nov, next 3 days: 16, 17, 18.
    assert.deepEqual(titles("days", at(16, 8), 3), [18]);
    assert.deepEqual(titles("days", at(16, 8), 2), []);
});

test("evening switch makes today mean tomorrow", () =>
{
    const settings = { range: "today" as const, keywords: "müll", eveningHour: 18 };
    // Tuesday 17:00: today is still Tuesday, no bin.
    assert.equal(UpcomingEvents.upcoming(parsed.events, sources, settings, at(17, 17)).length, 0);
    // Tuesday 19:00: "today" is Wednesday, the bin goes out.
    const evening = UpcomingEvents.upcoming(parsed.events, sources, settings, at(17, 19));
    assert.equal(evening.length, 1);
    assert.equal(new Date(evening[0].start).getDate(), 18);
});

test("max entries", () =>
{
    assert.equal(UpcomingEvents.upcoming(parsed.events, sources, { range: "days", days: 30, maxEntries: 2 }, at(16)).length, 2);
});

test("week strip has seven days with their events", () =>
{
    const strip = UpcomingEvents.weekStrip(parsed.events, sources, { keywords: "müll" }, at(16, 8));
    assert.equal(strip.length, 7);
    assert.deepEqual(strip.map((day) => day.events.length), [0, 0, 1, 0, 0, 0, 0]);
});

test("formatter: relative, weekday and time", () =>
{
    const formatter = new EventFormatter(at(17, 19), "en", "24");
    const bin = titled("Restmüll")[0];
    assert.equal(formatter.when(bin, "relative"), "tomorrow");
    assert.equal(formatter.when(bin, "weekday"), "Wed");
    assert.equal(formatter.when(bin, "time"), "Wed 07:00");
    const soon = new EventFormatter(at(18, 6, 35), "de", "24");
    assert.equal(soon.when(bin, "relative"), "in 25 Min.");
    assert.equal(soon.when(bin, "time"), "07:00");
    assert.equal(EventFormatter.iconOf("Restmüll"), "🗑️");
    assert.equal(EventFormatter.iconOf("Geburtstag Oma"), "🎂");
    assert.equal(EventFormatter.iconOf("Meeting"), "");
});
