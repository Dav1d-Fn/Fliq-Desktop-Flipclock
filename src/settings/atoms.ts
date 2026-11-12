import { atomWithStorage } from "jotai/utils";
import type { SunDays, WeatherReport } from "../weather/WeatherTypes";

// Every setting lives in localStorage under the key given here. The keys are part of existing
// installations, so they never change (typos like "seperatorString" included).
export const ATOMS = {
    LANGUAGE: atomWithStorage("lang", "en"),
    AUTOSTART: atomWithStorage("autostart", false),
    HIDE_IN_TASKBAR: atomWithStorage("hideInTaskbar", true),
    ALWAYS_ON_TOP: atomWithStorage("alwaysOnTop", true),
    TEXT_FONT: atomWithStorage("textFont", "Arial, sans-serif"),
    TEXT_COLOR: atomWithStorage("textColor", "#fafafaff"),
    TIME_FORMAT: atomWithStorage("format", "$FLIPTIME(HH:mm:ss)"),
    SEPARATOR_STRING: atomWithStorage("seperatorString", " /\\,.:"),
    CLOCK_PADDING: atomWithStorage("clockPadding", 17), // Padding in px
    CLOCK_TEXT_COLOR: atomWithStorage("clockTextColor", "#fafafaff"),
    CLOCK_TEXT_SIZE: atomWithStorage("clockTextSize", 26), // Text Size in px
    CLOCK_SEPARATOR_COLOR: atomWithStorage("clockSeparatorColor", "#fafafaff"),
    FLIPCARD_BACKGROUND: atomWithStorage("flipCardBackground", "#171717ff"),
    FLIPCARD_RADIUS: atomWithStorage("flipcardRounded", 70), // Rounding in %
    BOX_BACKGROUND: atomWithStorage("boxBackgroundColor", "#121212ab"),
    BOX_RADIUS: atomWithStorage("boxRounded", 30), // Rounding in %
    SECOND_ROW_ENABLED: atomWithStorage("secondRowEnabled", true),
    SECOND_ROW_CLOCK_TEXT_SIZE: atomWithStorage("secondRowClockTextSize", 12), // Text Size in px
    SECOND_ROW_TIME_FORMAT: atomWithStorage("secondRowFormat", "$TIME(dddd, DD.MM) $TEXT( ) $WEATHER(feelsLikeEmoji) $TEXT( ) $WEATHER(nextSun)"),
    SECOND_ROW_GAP: atomWithStorage("secondRowGap", 9), // Gap in px
    WEATHER_LOCATION: atomWithStorage("weatherLocation", ""), // Empty: wttr.in locates by IP
    WEATHER_UNIT: atomWithStorage("weatherUnit", "C"),
    // Caches written by useWeatherUpdates, not settings.
    WEATHER_REPORT: atomWithStorage<WeatherReport | null>("weatherReport", null),
    SUN_DAYS: atomWithStorage<SunDays | null>("sunDays", null),
};
