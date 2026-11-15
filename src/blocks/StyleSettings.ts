import { LayoutGrid, type ClockStyle, type GroupItem, type LayoutBlock } from "../layout/ClockLayout.ts";

// Look settings the block inspector can show. Each one is only shown when it changes
// something the block shows (settingsOf).
export type StyleSetting =
    | "align"
    | "font"
    | "color"
    | "letterSpacing"
    // The text size slider: "textSize" for text, "size" for drawn styles (same field).
    | "textSize"
    | "size"
    | "cards"
    | "glowColor"
    | "dialColor"
    | "handColor"
    | "secondHandColor"
    | "hourRingColor"
    | "minuteRingColor"
    | "secondRingColor"
    | "labelSize"
    | "progressColors"
    | "barShape";

// Shown for date, weather and text members.
const TEXT_SETTINGS: StyleSetting[] = ["align", "font", "color", "letterSpacing", "textSize"];

const ANALOG_SETTINGS: StyleSetting[] = ["align", "size", "dialColor", "handColor", "secondHandColor"];

// What each clock style draws with. Font and text color only where it draws text (the rings'
// label); lit styles take the glow color instead, analog its dial and hand colors.
const CLOCK_STYLE_SETTINGS: Record<ClockStyle, StyleSetting[]> = {
    flip: [...TEXT_SETTINGS, "cards"],
    text: TEXT_SETTINGS,
    segment: ["align", "size", "glowColor"],
    dots: ["align", "size", "glowColor"],
    nixie: ["align", "size", "glowColor"],
    analogMinimal: ANALOG_SETTINGS,
    analogClassic: ANALOG_SETTINGS,
    analogFine: ANALOG_SETTINGS,
    rings: ["align", "size", "font", "color", "labelSize", "hourRingColor", "minuteRingColor", "secondRingColor"],
    progress: ["align", "size", "progressColors"],
};

// Only there while the clock shows seconds.
const SECONDS_SETTINGS: StyleSetting[] = ["secondHandColor", "secondRingColor"];

export function showsSeconds(item: GroupItem): boolean
{
    const format = item.display === "custom" ? item.customFormat ?? "" : item.display;
    return format.includes("s");
}

// Shows emoji that can be drawn as colored or flat icons (IconStyleSettings).
export function showsIcons(item: GroupItem): boolean
{
    if (item.kind === "weather")
    {
        return item.weatherIcon !== false;
    }
    return item.kind === "calendar" && item.display !== "week" && item.calendar?.icons !== false;
}

function itemSettings(item: GroupItem): StyleSetting[]
{
    if (item.kind !== "clock")
    {
        return TEXT_SETTINGS;
    }
    if (item.clockStyle === "progress" && (item.progressShape ?? "bar") === "bar")
    {
        // Fills the block's width at its own thickness: no size or alignment.
        return ["progressColors", "barShape"];
    }
    const settings = CLOCK_STYLE_SETTINGS[item.clockStyle ?? "flip"];
    // Progress has no display choice, so its "seconds" mean nothing.
    if (item.clockStyle === "progress" || showsSeconds(item))
    {
        return settings;
    }
    return settings.filter((setting) => !SECONDS_SETTINGS.includes(setting));
}

// The settings that change something a block shows; for a group, those of any member. The
// size slider is "textSize" as soon as one member is text.
export function settingsOf(block: LayoutBlock): Set<StyleSetting>
{
    const settings = new Set(LayoutGrid.itemsOf(block).flatMap(itemSettings));
    if (settings.has("textSize"))
    {
        settings.delete("size");
    }
    return settings;
}

// Colors a clock style draws with. Unset, each falls back to the style's own color (faces.css,
// BLOCK_DEFAULTS) or the clock's text color, which is what the picker's previews show.
export const STYLE_COLOR_FIELDS = [
    "color",
    "cardColor",
    "glowColor",
    "dialColor",
    "handColor",
    "secondHandColor",
    "hourRingColor",
    "minuteRingColor",
    "secondRingColor",
    "barColor",
    "barTrackColor",
] as const;

// Switches a block to `style` and drops the colors chosen for the old one, so it looks like
// the new style's preview. The block's own background stays.
export function withClockStyle(style: ClockStyle): Partial<LayoutBlock>
{
    const patch: Partial<LayoutBlock> = { clockStyle: style };
    for (const field of STYLE_COLOR_FIELDS)
    {
        patch[field] = undefined;
    }
    return patch;
}
