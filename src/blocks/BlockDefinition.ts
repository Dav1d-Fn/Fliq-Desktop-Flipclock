import type { Segment } from "../clock/ClockTemplate.ts";
import type { BlockKind, LayoutBlock } from "../layout/ClockLayout.ts";

export type HourCycle = "24" | "12";

// Whole-clock settings that change what blocks show (Data › Time).
export interface SegmentContext
{
    hourCycle: HourCycle;
    hourLeadingZero: boolean;
}

export const DEFAULT_SEGMENT_CONTEXT: SegmentContext = { hourCycle: "24", hourLeadingZero: true };

export interface DisplayOption
{
    id: string;
    label: string;
    // Day.js format shown under the label; left out where it would mean nothing to the user.
    code?: string;
}

// One kind of block. Palette, inspector and display dropdown are built from these, so a new
// feature is a new definition in BLOCK_DEFINITIONS (plus its icon and optional settings panel
// in the styling window, see BlockEditors).
export interface BlockDefinition
{
    kind: BlockKind;
    name: string;
    defaultSize: { w: number; h: number };
    // Fields a new block of this kind starts with, besides kind, position and size.
    defaults: Partial<LayoutBlock> & { display: string };
    displayOptions: DisplayOption[];
    // Offers "Custom format" with a Day.js format of the user's own.
    supportsCustomFormat: boolean;
    // Left/center/right; flip cards are always centered.
    alignable: boolean;
    // What the block shows. The text format strings stay internal, the UI never shows them
    // except in "Custom format".
    segments: (block: LayoutBlock, context: SegmentContext) => Segment[];
}

// The Day.js format a date block shows: one of its options or the custom one.
export function chosenFormat(block: LayoutBlock): string
{
    return block.display === "custom" ? block.customFormat ?? "" : block.display;
}

// The Day.js format a time block shows. Hours follow the global clock format; the display only
// says whether seconds are shown. The ids are "HH:mm" and "HH:mm:ss" (stored values of older
// versions, which still read them); the old 12-hour ids count as "HH:mm". A custom format
// stays exactly as typed. `meridiem` adds AM/PM in 12-hour mode.
export function timeFormat(block: LayoutBlock, context: SegmentContext, meridiem: boolean): string
{
    if (block.display === "custom")
    {
        return block.customFormat ?? "";
    }
    const twelveHour = context.hourCycle === "12";
    const hour = twelveHour ? "h" : "H";
    const hours = context.hourLeadingZero ? hour + hour : hour;
    const seconds = block.display.includes("ss") ? ":ss" : "";
    const suffix = meridiem && twelveHour ? " A" : "";
    return `${hours}:mm${seconds}${suffix}`;
}
