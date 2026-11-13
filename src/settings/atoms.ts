import { atomWithStorage } from "jotai/utils";
import type { HourCycle } from "../blocks/BlockDefinition";
import { DEFAULT_LAYOUT, type ClockLayout } from "../layout/ClockLayout";
import { LAYOUT_KEYS, LayoutMigration } from "../layout/LayoutMigration";
import type { SunDays, WeatherReport } from "../weather/WeatherTypes";

// Before any atom reads storage: turns the old two-row settings into a grid layout, once.
new LayoutMigration(localStorage).run();

// Every setting lives in localStorage under the key given here. The keys are part of existing
// installations, so they never change.
export const ATOMS = {
    LANGUAGE: atomWithStorage("lang", "en"),
    // Data › Time: hours of every time block without a custom format. Same keys as
    // LAYOUT_KEYS.hourCycle/hourLeadingZero; written as literals so the tuxhub test sees them.
    HOUR_CYCLE: atomWithStorage<HourCycle>("hourCycle", "24"),
    HOUR_LEADING_ZERO: atomWithStorage("hourLeadingZero", true),
    AUTOSTART: atomWithStorage("autostart", false),
    HIDE_IN_TASKBAR: atomWithStorage("hideInTaskbar", true),
    ALWAYS_ON_TOP: atomWithStorage("alwaysOnTop", true),
    // The blocks and the grid. Edited in the styling window only.
    CLOCK_LAYOUT: atomWithStorage<ClockLayout>(LAYOUT_KEYS.layout, DEFAULT_LAYOUT),
    // Whole clock: window look and the defaults every block inherits.
    CLOCK_SCALE: atomWithStorage(LAYOUT_KEYS.scale, 75), // Size in % of the editor's cell size
    BOX_BACKGROUND: atomWithStorage("boxBackgroundColor", "#1a1a1ade"),
    CLOCK_CORNER_RADIUS: atomWithStorage(LAYOUT_KEYS.cornerRadius, 17), // px at 100 %
    CLOCK_PADDING: atomWithStorage("clockPadding", 7), // px at 100 %
    TEXT_FONT: atomWithStorage("textFont", "\"JetBrains Mono Variable\", monospace"),
    TEXT_COLOR: atomWithStorage("textColor", "#fafafaff"),
    WEATHER_LOCATION: atomWithStorage("weatherLocation", ""), // Empty: wttr.in locates by IP
    WEATHER_UNIT: atomWithStorage("weatherUnit", "C"),
    // Caches written by useWeatherUpdates, not settings.
    WEATHER_REPORT: atomWithStorage<WeatherReport | null>("weatherReport", null),
    SUN_DAYS: atomWithStorage<SunDays | null>("sunDays", null),
};
