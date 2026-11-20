import { atomWithStorage } from "jotai/utils";
import type { HourCycle } from "../blocks/BlockDefinition";
import { DEFAULT_LAYOUT, type ClockLayout } from "../layout/ClockLayout";
import { LAYOUT_KEYS, LayoutMigration } from "../layout/LayoutMigration";
import type { SavedLayout } from "../layout/LayoutLibrary";
import type { CalendarFeed, CalendarSource } from "../calendar/CalendarTypes";
import type { SunDays, WeatherReport } from "../weather/WeatherTypes";
import type { WeatherPlace } from "../weather/WeatherPlace";
import { systemDateLanguage, systemUiLanguage } from "../i18n/UiLanguage";
import type { SettingsColorScheme, UiLanguage } from "./options";

// Before any atom reads storage: turns the old two-row settings into a grid layout, once.
new LayoutMigration(localStorage).run();

// Every setting lives in localStorage under the key given here. The keys are part of existing
// installations, so they never change.
export const ATOMS = {
    // Settings window and right-click menu. Until chosen, the system language.
    UI_LANGUAGE: atomWithStorage<UiLanguage>("uiLanguage", systemUiLanguage()),
    // Light or dark settings window, or the system's choice.
    SETTINGS_COLOR_SCHEME: atomWithStorage<SettingsColorScheme>("settingsColorScheme", "light"),
    // Dates and weather. Until chosen, the system language if dates can be shown in it.
    LANGUAGE: atomWithStorage("lang", systemDateLanguage()),
    // Data › Time: hours of every time block without a custom format. Same keys as
    // LAYOUT_KEYS.hourCycle/hourLeadingZero; written as literals so the tuxhub test sees them.
    HOUR_CYCLE: atomWithStorage<HourCycle>("hourCycle", "24"),
    HOUR_LEADING_ZERO: atomWithStorage("hourLeadingZero", true),
    AUTOSTART: atomWithStorage("autostart", false),
    HIDE_IN_TASKBAR: atomWithStorage("hideInTaskbar", true),
    ALWAYS_ON_TOP: atomWithStorage("alwaysOnTop", true),
    // The blocks and the grid. Edited in the settings window only.
    CLOCK_LAYOUT: atomWithStorage<ClockLayout>(LAYOUT_KEYS.layout, DEFAULT_LAYOUT),
    // Clock › Saved layouts: named copies of CLOCK_LAYOUT, and the one last saved or loaded
    // (null: the current layout is not one of them).
    SAVED_LAYOUTS: atomWithStorage<SavedLayout[]>("savedLayouts", []),
    ACTIVE_LAYOUT_ID: atomWithStorage<number | null>("activeLayoutId", null),
    // Whole clock: window look and the defaults every block inherits.
    CLOCK_SCALE: atomWithStorage(LAYOUT_KEYS.scale, 75), // Size in % of the editor's cell size
    BOX_BACKGROUND: atomWithStorage("boxBackgroundColor", "#1a1a1ade"),
    CLOCK_CORNER_RADIUS: atomWithStorage(LAYOUT_KEYS.cornerRadius, 17), // px at 100 %
    CLOCK_PADDING: atomWithStorage("clockPadding", 7), // px at 100 %
    TEXT_FONT: atomWithStorage("textFont", "\"JetBrains Mono Variable\", monospace"),
    TEXT_COLOR: atomWithStorage("textColor", "#fafafaff"),
    WEATHER_LOCATION: atomWithStorage("weatherLocation", ""), // Empty: wttr.in locates by IP
    // The place picked from the city search; used while WEATHER_LOCATION still shows its label.
    WEATHER_PLACE: atomWithStorage<WeatherPlace | null>("weatherPlace", null),
    WEATHER_UNIT: atomWithStorage("weatherUnit", "C"),
    // Caches written by useWeatherUpdates, not settings.
    WEATHER_REPORT: atomWithStorage<WeatherReport | null>("weatherReport", null),
    SUN_DAYS: atomWithStorage<SunDays | null>("sunDays", null),
    // Data › Calendar: the calendars (with their secret links) and how often they are fetched.
    CALENDAR_SOURCES: atomWithStorage<CalendarSource[]>("calendarSources", []),
    CALENDAR_REFRESH_MINUTES: atomWithStorage("calendarRefreshMinutes", 15),
    // Cache written by CalendarSync: the last good events per source id.
    CALENDAR_FEEDS: atomWithStorage<Record<string, CalendarFeed>>("calendarFeeds", {}),
};
