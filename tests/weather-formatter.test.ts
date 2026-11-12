// Runs with `npm test` (node --test, no extra dependency).
import { test } from "node:test";
import assert from "node:assert/strict";
import { WeatherFormatter } from "../src/weather/WeatherFormatter.ts";
import type { SunDays, WeatherReport } from "../src/weather/WeatherTypes.ts";

const report: WeatherReport = {
    temperatureCelsius: "5",
    temperatureFahrenheit: "41",
    feelsLikeCelsius: "2",
    feelsLikeFahrenheit: "36",
    descriptionEnglish: "Clear",
    descriptionLocalized: "Klar",
    latitude: "52.5",
    longitude: "13.4",
};

const at = (hours: number, minutes = 0, day = 12) => new Date(2026, 10, day, hours, minutes);

const sunDays: SunDays = {
    latitude: "52.5",
    longitude: "13.4",
    days: [
        { date: "2026-11-12", sunrise: at(7, 23).getTime(), sunset: at(16, 18).getTime() },
        { date: "2026-11-13", sunrise: at(7, 25, 13).getTime(), sunset: at(16, 16, 13).getTime() },
    ],
};

const format = (key: string, now: Date, unit = "C") => new WeatherFormatter(report, sunDays, unit, now).format(key);
const time = (date: Date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

test("next sun event moves on with the time, after sunset to tomorrow's sunrise", () =>
{
    assert.equal(format("nextSun", at(6)), `🌅 ${time(at(7, 23))}`);
    assert.equal(format("nextSun", at(12)), `🌇 ${time(at(16, 18))}`);
    assert.equal(format("nextSun", at(20)), `🌅 ${time(at(7, 25, 13))}`);
});

test("day and night emoji follow the sun times", () =>
{
    assert.equal(format("emoji", at(12)), "☀️");
    assert.equal(format("emoji", at(20)), "🌕");
});

test("unit switch needs no new data", () =>
{
    assert.equal(format("temp", at(12), "C"), "5 °C");
    assert.equal(format("feelsLike", at(12), "F"), "36 °F");
});

test("unknown and default keys show the full line", () =>
{
    assert.equal(format("default", at(12)), "☀️ 5 °C – Klar");
    assert.equal(format("whatever", at(12)), "☀️ 5 °C – Klar");
});

test("no data yet shows the loading text", () =>
{
    assert.equal(new WeatherFormatter(null, null, "C", at(12)).format("temp"), "Loading weather…");
});
