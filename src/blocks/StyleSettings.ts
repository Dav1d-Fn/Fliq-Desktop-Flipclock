import { LayoutGrid, type ClockStyle, type GroupItem, type LayoutBlock, type TextStyle } from "../layout/ClockLayout.ts";

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
    | "flipUnit"
    | "glowColor"
    | "dialColor"
    | "handColor"
    | "secondHandColor"
    | "hourRingColor"
    | "minuteRingColor"
    | "secondRingColor"
    | "labelSize"
    | "progressColors"
    | "barShape"
    // Room between the block's own background and its content; without a background, space
    // between blocks is only the gaps, so there is no padding to set.
    | "padding";

const TEXT_SETTINGS: StyleSetting[] = ["align", "font", "color", "letterSpacing", "textSize"];
const LIT_SETTINGS: StyleSetting[] = ["align", "size", "glowColor"];

// What each text style draws with: flip and text the font and color (flip also its cards);
// the lit styles their glow color instead.
const TEXT_STYLE_SETTINGS: Record<TextStyle, StyleSetting[]> = {
    flip: [...TEXT_SETTINGS, "cards", "flipUnit"],
    text: TEXT_SETTINGS,
    segment: LIT_SETTINGS,
    dots: LIT_SETTINGS,
    nixie: LIT_SETTINGS,
};

const ANALOG_SETTINGS: StyleSetting[] = ["align", "size", "dialColor", "handColor", "secondHandColor"];

// What each clock face draws with. Font and text color only where it draws text (the rings'
// label); analog its dial and hand colors.
const CLOCK_FACE_SETTINGS: Record<Exclude<ClockStyle, "digital">, StyleSetting[]> = {
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

// The text style a member is drawn in: its own (only from the migration) or its block's.
export function itemTextStyle(item: GroupItem, block: LayoutBlock): TextStyle
{
    return item.textStyle ?? block.textStyle ?? "text";
}

// The clock face a clock member draws, or null when it shows digits in its text style.
function clockFace(item: GroupItem): Exclude<ClockStyle, "digital"> | null
{
    const style = item.kind === "clock" ? item.clockStyle ?? "digital" : "digital";
    return style === "digital" ? null : style;
}

// Whether a block (or member) draws text, so its text style means something.
export function drawsText(item: GroupItem): boolean
{
    return clockFace(item) === null;
}

function itemSettings(item: GroupItem, block: LayoutBlock): StyleSetting[]
{
    const face = clockFace(item);
    if (face === null)
    {
        return TEXT_STYLE_SETTINGS[itemTextStyle(item, block)];
    }
    if (face === "progress" && (item.progressShape ?? "bar") === "bar")
    {
        // Fills the block's width at its own thickness: no size or alignment.
        return ["progressColors", "barShape"];
    }
    const settings = CLOCK_FACE_SETTINGS[face];
    // Progress has no display choice, so its "seconds" mean nothing.
    if (face === "progress" || showsSeconds(item))
    {
        return settings;
    }
    return settings.filter((setting) => !SECONDS_SETTINGS.includes(setting));
}

// The settings that change something a block shows; for a group, those of any member. The
// size slider is "textSize" as soon as one member is text. Padding only with an own background.
export function settingsOf(block: LayoutBlock): Set<StyleSetting>
{
    const settings = new Set(LayoutGrid.itemsOf(block).flatMap((item) => itemSettings(item, block)));
    if (settings.has("textSize"))
    {
        settings.delete("size");
    }
    if (block.background)
    {
        settings.add("padding");
    }
    return settings;
}

// Colors a text style or clock face draws with. Unset, each falls back to the style's own color (faces.css,
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

// Drops the colors chosen for the old style, so the block looks like the new style's preview.
// The block's own background stays.
function withoutStyleColors(patch: Partial<LayoutBlock>): Partial<LayoutBlock>
{
    for (const field of STYLE_COLOR_FIELDS)
    {
        patch[field] = undefined;
    }
    return patch;
}

// Switches a clock block to a face, or back to digits ("digital").
export function withClockStyle(style: ClockStyle): Partial<LayoutBlock>
{
    return withoutStyleColors({ clockStyle: style === "digital" ? undefined : style });
}

// Switches a block (a group: every member) to a text style. A clock showing a face goes back
// to digits. LCD and dot matrix draw single-colored characters, so emoji icons that were never
// chosen become flat line icons beside them.
export function withTextStyle(block: LayoutBlock, style: TextStyle): Partial<LayoutBlock>
{
    const patch = withoutStyleColors({ textStyle: style });
    if (block.kind === "clock")
    {
        patch.clockStyle = undefined;
    }
    if (block.items?.some((item) => item.textStyle !== undefined))
    {
        patch.items = block.items.map((item) =>
        {
            const shared = { ...item };
            delete shared.textStyle;
            return shared;
        });
    }
    const singleColored = style === "segment" || style === "dots";
    if (singleColored && block.iconStyle === undefined && LayoutGrid.itemsOf(block).some(showsIcons))
    {
        patch.iconStyle = "flat";
    }
    return patch;
}
