// Checks a layout that comes from outside Fliq (the tuxhub socket) before it is stored and
// drawn. Pure, no React, Jotai or Tauri, so `npm test` runs it with plain Node.
//
// Every field of ClockLayout, LayoutBlock, GroupItem and CalendarBlockSettings has a rule in a
// table typed `Record<keyof …, Rule>`, and every choice list is a `Record<Union, true>`: a field
// or choice added to the model without a rule here fails `tsc`, so the validator cannot quietly
// fall behind the editor again.
import { MAX_RANGE_DAYS, type CalendarBlockSettings, type CalendarRange, type CalendarTimeStyle } from "../calendar/CalendarTypes.ts";
import { STYLE_COLOR_FIELDS } from "../blocks/StyleSettings.ts";
import {
    CONTENT_LIMITS,
    GRID_LIMITS,
    LayoutGrid,
    isProgressBar,
    type BlockAlign,
    type BlockKind,
    type ClockLayout,
    type ClockStyle,
    type FlipUnit,
    type GroupDirection,
    type GroupItem,
    type IconStyle,
    type LayoutBlock,
    type MemberKind,
    type ProgressMotion,
    type ProgressShape,
    type ProgressUnit,
    type RowAlign,
    type TextStyle,
} from "./ClockLayout.ts";

interface NumberBounds
{
    min: number;
    max: number;
}

// Checks one field's value and returns what is stored; throws InvalidLayout when it does not fit.
type Rule = (value: unknown) => unknown;

const MAX_BLOCKS = 32;
const MAX_TEXT_LENGTH = CONTENT_LIMITS.textLength;
const MAX_FONT_LENGTH = 120;
const MAX_CALENDAR_SOURCES = 64;

// Choice lists. `Record<Union, true>` makes `tsc` fail when the union gains or loses a member.
const MEMBER_KINDS: Record<MemberKind, true> = { clock: true, date: true, weather: true, text: true, calendar: true };
const BLOCK_KINDS: Record<BlockKind, true> = { ...MEMBER_KINDS, group: true };
const ALIGNMENTS: Record<BlockAlign, true> = { left: true, center: true, right: true };
const ROW_ALIGNMENTS: Record<RowAlign, true> = { top: true, center: true, bottom: true };
const TEXT_STYLES: Record<TextStyle, true> = { flip: true, text: true, segment: true, dots: true, nixie: true };
const CLOCK_STYLES: Record<ClockStyle, true> = { digital: true, analogMinimal: true, analogClassic: true, analogFine: true, rings: true, progress: true };
const FLIP_UNITS: Record<FlipUnit, true> = { character: true, word: true };
const PROGRESS_SHAPES: Record<ProgressShape, true> = { bar: true, ring: true, dots: true };
const PROGRESS_UNITS: Record<ProgressUnit, true> = { minute: true, hour: true, day: true };
const PROGRESS_MOTIONS: Record<ProgressMotion, true> = { stepped: true, smooth: true };
const ICON_STYLES: Record<IconStyle, true> = { colored: true, flat: true };
const GROUP_DIRECTIONS: Record<GroupDirection, true> = { row: true, column: true };
const CALENDAR_RANGES: Record<CalendarRange, true> = { today: true, tomorrow: true, week: true, days: true };
const CALENDAR_TIME_STYLES: Record<CalendarTimeStyle, true> = { relative: true, weekday: true, time: true };

const COLOR_PATTERN = /^#([0-9a-f]{6}|[0-9a-f]{8})$/i;
// A CSS font-family list: names, quotes, commas. Nothing that could end the declaration.
const FONT_PATTERN = /^[\w\s",.'-]+$/;

// Safety bounds, wider than the editor's sliders: layouts migrated from older versions may lie
// outside the sliders and still have to pass.
const GAP_BOUNDS: NumberBounds = { min: 0, max: 512 };
const TRACK_SIZE_BOUNDS: NumberBounds = { min: 1, max: 2048 };
const PIXEL_BOUNDS: NumberBounds = { min: 0, max: 256 };
const OFFSET_BOUNDS: NumberBounds = { min: -2000, max: 2000 };

// Thrown inside the validator for the first thing that does not fit; `validated` turns it
// into null.
class InvalidLayout extends Error
{
}

function record(value: unknown): Record<string, unknown>
{
    if (value === null || typeof value !== "object" || Array.isArray(value))
    {
        throw new InvalidLayout();
    }
    return value as Record<string, unknown>;
}

function numberIn(bounds: NumberBounds): Rule
{
    return (value) =>
    {
        if (typeof value !== "number" || !Number.isFinite(value) || value < bounds.min || value > bounds.max)
        {
            throw new InvalidLayout();
        }
        return value;
    };
}

function wholeNumberIn(bounds: NumberBounds): Rule
{
    const inBounds = numberIn(bounds);
    return (value) =>
    {
        const number = inBounds(value);
        if (!Number.isInteger(number))
        {
            throw new InvalidLayout();
        }
        return number;
    };
}

function textUpTo(maxLength: number): Rule
{
    return (value) =>
    {
        if (typeof value !== "string" || [...value].length > maxLength)
        {
            throw new InvalidLayout();
        }
        return value;
    };
}

function oneOf(choices: Record<string, true>): Rule
{
    return (value) =>
    {
        if (typeof value !== "string" || !Object.prototype.hasOwnProperty.call(choices, value))
        {
            throw new InvalidLayout();
        }
        return value;
    };
}

function listOf(itemRule: Rule, maxLength: number): Rule
{
    return (value) =>
    {
        if (!Array.isArray(value) || value.length > maxLength)
        {
            throw new InvalidLayout();
        }
        return value.map(itemRule);
    };
}

const flag: Rule = (value) =>
{
    if (typeof value !== "boolean")
    {
        throw new InvalidLayout();
    }
    return value;
};

const color: Rule = (value) =>
{
    if (typeof value !== "string" || !COLOR_PATTERN.test(value))
    {
        throw new InvalidLayout();
    }
    return value.toLowerCase();
};

const font: Rule = (value) =>
{
    const fontList = textUpTo(MAX_FONT_LENGTH)(value) as string;
    if (!FONT_PATTERN.test(fontList))
    {
        throw new InvalidLayout();
    }
    return fontList;
};

const text = textUpTo(MAX_TEXT_LENGTH);

// Copies the fields of `rules` that `source` has (and the `required` ones, which must be
// there); everything else in `source` is dropped.
function copied<Target>(source: Record<string, unknown>, rules: Record<string, Rule>, required: string[] = []): Target
{
    const target: Record<string, unknown> = {};
    for (const [field, rule] of Object.entries(rules))
    {
        const value = Object.prototype.hasOwnProperty.call(source, field) ? source[field] : undefined;
        if (value === undefined && !required.includes(field))
        {
            continue;
        }
        target[field] = rule(value);
    }
    return target as Target;
}

const CALENDAR_RULES: Record<keyof CalendarBlockSettings, Rule> = {
    // Source ids, not the secret links (those stay in calendarSources).
    sources: listOf(text, MAX_CALENDAR_SOURCES),
    keywords: text,
    range: oneOf(CALENDAR_RANGES),
    days: wholeNumberIn({ min: 1, max: MAX_RANGE_DAYS }),
    maxEntries: wholeNumberIn({ min: 1, max: 50 }),
    eveningHour: wholeNumberIn({ min: 0, max: 23 }),
    timeStyle: oneOf(CALENDAR_TIME_STYLES),
    allDay: flag,
    icons: flag,
    colorDot: flag,
    emptyText: text,
};

const calendar: Rule = (value) => copied<CalendarBlockSettings>(record(value), CALENDAR_RULES);

// What a block or a group member shows.
const CONTENT_RULES = {
    display: text,
    customFormat: text,
    text,
    weatherIcon: flag,
    clockStyle: oneOf(CLOCK_STYLES),
    calendar,
    progressShape: oneOf(PROGRESS_SHAPES),
    progressUnit: oneOf(PROGRESS_UNITS),
    progressMotion: oneOf(PROGRESS_MOTIONS),
};

const MEMBER_RULES: Record<keyof GroupItem, Rule> = {
    ...CONTENT_RULES,
    kind: oneOf(MEMBER_KINDS),
    textStyle: oneOf(TEXT_STYLES),
};

const member: Rule = (value) =>
{
    const item = copied<GroupItem>(record(value), MEMBER_RULES, ["kind", "display"]);
    // A progress bar fills its block's width and cannot join a group (see isProgressBar).
    if (isProgressBar(item))
    {
        throw new InvalidLayout();
    }
    return item;
};

const members: Rule = (value) =>
{
    const items = listOf(member, CONTENT_LIMITS.groupMembers)(value) as GroupItem[];
    if (items.length < 1)
    {
        throw new InvalidLayout();
    }
    return items;
};

// Every style color (STYLE_COLOR_FIELDS) plus the block's own background.
const COLOR_RULES = Object.fromEntries([...STYLE_COLOR_FIELDS, "backgroundColor"].map((field) => [field, color])) as Record<(typeof STYLE_COLOR_FIELDS)[number] | "backgroundColor", Rule>;

const BLOCK_RULES: Record<keyof LayoutBlock, Rule> = {
    ...CONTENT_RULES,
    ...COLOR_RULES,
    id: wholeNumberIn({ min: 1, max: Number.MAX_SAFE_INTEGER }),
    kind: oneOf(BLOCK_KINDS),
    x: wholeNumberIn({ min: 0, max: GRID_LIMITS.maxColumns }),
    y: wholeNumberIn({ min: 0, max: GRID_LIMITS.maxRows }),
    w: wholeNumberIn({ min: 1, max: GRID_LIMITS.maxColumns }),
    h: wholeNumberIn({ min: 1, max: GRID_LIMITS.maxRows }),
    items: members,
    itemGap: numberIn({ min: 0, max: 20 }),
    direction: oneOf(GROUP_DIRECTIONS),
    align: oneOf(ALIGNMENTS),
    iconStyle: oneOf(ICON_STYLES),
    textStyle: oneOf(TEXT_STYLES),
    flipUnit: oneOf(FLIP_UNITS),
    font,
    labelSize: numberIn({ min: 0, max: 500 }),
    cardRadius: numberIn({ min: 0, max: 100 }),
    paddingX: numberIn(PIXEL_BOUNDS),
    paddingY: numberIn(PIXEL_BOUNDS),
    background: flag,
    backgroundRadius: numberIn(PIXEL_BOUNDS),
    textSize: numberIn({ min: 1, max: 1000 }),
    letterSpacing: numberIn({ min: -2, max: 5 }),
    offsetX: numberIn(OFFSET_BOUNDS),
    offsetY: numberIn(OFFSET_BOUNDS),
    barThickness: numberIn(PIXEL_BOUNDS),
    barRadius: numberIn(PIXEL_BOUNDS),
};

const REQUIRED_BLOCK_FIELDS: (keyof LayoutBlock)[] = ["id", "kind", "x", "y", "w", "h", "display"];

// The grid's own fields; `blocks` is checked block by block in `layout`.
const LAYOUT_RULES: Record<Exclude<keyof ClockLayout, "blocks">, Rule> = {
    columns: wholeNumberIn({ min: GRID_LIMITS.minColumns, max: GRID_LIMITS.maxColumns }),
    rows: wholeNumberIn({ min: GRID_LIMITS.minRows, max: GRID_LIMITS.maxRows }),
    columnGap: numberIn(GAP_BOUNDS),
    rowGap: numberIn(GAP_BOUNDS),
    columnWidth: numberIn(TRACK_SIZE_BOUNDS),
    columnWidths: listOf((entry) => (entry === null ? null : numberIn(TRACK_SIZE_BOUNDS)(entry)), GRID_LIMITS.maxColumns),
    rowAlign: oneOf(ROW_ALIGNMENTS),
};

export class LayoutValidator
{
    // The layout rebuilt from known fields only, or null when anything in it does not fit.
    // Unknown fields (also those of older versions, like row heights) are dropped. Colors come
    // back in lower case.
    validated(value: unknown): ClockLayout | null
    {
        try
        {
            return this.layout(value);
        }
        catch (error)
        {
            if (error instanceof InvalidLayout)
            {
                return null;
            }
            throw error;
        }
    }

    private layout(value: unknown): ClockLayout
    {
        const source = record(value);
        const layout = copied<ClockLayout>(source, LAYOUT_RULES, ["columns", "rows"]);
        if (layout.columnWidths && layout.columnWidths.length > layout.columns)
        {
            throw new InvalidLayout();
        }
        if (!Array.isArray(source.blocks) || source.blocks.length > MAX_BLOCKS)
        {
            throw new InvalidLayout();
        }

        layout.blocks = [];
        for (const blockValue of source.blocks)
        {
            const block = LayoutValidator.block(blockValue);
            const idTaken = layout.blocks.some((placed) => placed.id === block.id);
            // `fits` sees the blocks placed so far: inside the grid and on free cells only.
            if (idTaken || !new LayoutGrid(layout).fits(block))
            {
                throw new InvalidLayout();
            }
            layout.blocks.push(block);
        }
        return layout;
    }

    private static block(value: unknown): LayoutBlock
    {
        const block = copied<LayoutBlock>(record(value), BLOCK_RULES, REQUIRED_BLOCK_FIELDS);
        // Members belong to groups only, and a group needs them.
        if (block.kind === "group" && block.items === undefined)
        {
            throw new InvalidLayout();
        }
        if (block.kind !== "group")
        {
            delete block.items;
        }
        return block;
    }
}
