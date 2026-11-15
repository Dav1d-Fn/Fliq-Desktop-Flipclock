// Checks a layout that comes from outside Fliq (the tuxhub socket) before it is stored and
// drawn. Pure, no React, Jotai or Tauri, so `npm test` runs it with plain Node.
import { GRID_LIMITS, LayoutGrid, type BlockAlign, type BlockKind, type ClockLayout, type GroupItem, type LayoutBlock, type MemberKind } from "./ClockLayout.ts";

interface NumberBounds
{
    min: number;
    max: number;
}

const MAX_BLOCKS = 32;
const MAX_GROUP_MEMBERS = 8;
const MAX_TEXT_LENGTH = 200;
const MAX_FONT_LENGTH = 120;

const MEMBER_KINDS: MemberKind[] = ["flip", "time", "date", "weather", "text"];
const BLOCK_KINDS: BlockKind[] = [...MEMBER_KINDS, "group"];
const ALIGNMENTS: BlockAlign[] = ["left", "center", "right"];

const COLOR_PATTERN = /^#([0-9a-f]{6}|[0-9a-f]{8})$/i;
// A CSS font-family list: names, quotes, commas. Nothing that could end the declaration.
const FONT_PATTERN = /^[\w\s",.'-]+$/;

// Safety bounds, wider than the editor's sliders: layouts migrated from 1.x may lie outside the
// sliders and still have to pass.
const BLOCK_NUMBER_BOUNDS: Record<"cardRadius" | "padding" | "backgroundRadius" | "textSize" | "letterSpacing" | "offsetX" | "offsetY" | "itemGap", NumberBounds> = {
    cardRadius: { min: 0, max: 100 },
    padding: { min: 0, max: 256 },
    backgroundRadius: { min: 0, max: 256 },
    textSize: { min: 1, max: 1000 },
    letterSpacing: { min: -2, max: 5 },
    offsetX: { min: -2000, max: 2000 },
    offsetY: { min: -2000, max: 2000 },
    itemGap: { min: 0, max: 20 },
};

const GAP_BOUNDS: NumberBounds = { min: 0, max: 512 };
const TRACK_SIZE_BOUNDS: NumberBounds = { min: 1, max: 2048 };

// Thrown inside the validator for the first thing that does not fit; `validated` turns it
// into null.
class InvalidLayout extends Error
{
}

export class LayoutValidator
{
    // The layout rebuilt from known fields only, or null when anything in it does not fit.
    // Unknown fields are dropped. Colors come back in lower case.
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
        const source = LayoutValidator.record(value);
        const columns = LayoutValidator.wholeNumber(source.columns, { min: GRID_LIMITS.minColumns, max: GRID_LIMITS.maxColumns });
        const rows = LayoutValidator.wholeNumber(source.rows, { min: GRID_LIMITS.minRows, max: GRID_LIMITS.maxRows });
        if (!Array.isArray(source.blocks) || source.blocks.length > MAX_BLOCKS)
        {
            throw new InvalidLayout();
        }

        const layout: ClockLayout = { columns, rows, blocks: [] };
        for (const blockValue of source.blocks)
        {
            const block = this.block(blockValue);
            const idTaken = layout.blocks.some((placed) => placed.id === block.id);
            // `fits` sees the blocks placed so far: inside the grid and on free cells only.
            if (idTaken || !new LayoutGrid(layout).fits(block))
            {
                throw new InvalidLayout();
            }
            layout.blocks.push(block);
        }

        LayoutValidator.copyNumber(source, layout, "columnGap", GAP_BOUNDS);
        LayoutValidator.copyNumber(source, layout, "rowGap", GAP_BOUNDS);
        LayoutValidator.copyNumber(source, layout, "columnWidth", TRACK_SIZE_BOUNDS);
        LayoutValidator.copyNumber(source, layout, "rowHeight", TRACK_SIZE_BOUNDS);
        LayoutValidator.copyOverrides(source, layout, "columnGaps", columns, GAP_BOUNDS);
        LayoutValidator.copyOverrides(source, layout, "rowGaps", rows, GAP_BOUNDS);
        LayoutValidator.copyOverrides(source, layout, "columnWidths", columns, TRACK_SIZE_BOUNDS);
        LayoutValidator.copyOverrides(source, layout, "rowHeights", rows, TRACK_SIZE_BOUNDS);
        return layout;
    }

    private block(value: unknown): LayoutBlock
    {
        const source = LayoutValidator.record(value);
        const kind = LayoutValidator.oneOf(source.kind, BLOCK_KINDS);
        const block: LayoutBlock = {
            id: LayoutValidator.wholeNumber(source.id, { min: 1, max: Number.MAX_SAFE_INTEGER }),
            kind,
            x: LayoutValidator.wholeNumber(source.x, { min: 0, max: GRID_LIMITS.maxColumns }),
            y: LayoutValidator.wholeNumber(source.y, { min: 0, max: GRID_LIMITS.maxRows }),
            w: LayoutValidator.wholeNumber(source.w, { min: 1, max: GRID_LIMITS.maxColumns }),
            h: LayoutValidator.wholeNumber(source.h, { min: 1, max: GRID_LIMITS.maxRows }),
            display: LayoutValidator.text(source.display, MAX_TEXT_LENGTH),
        };

        LayoutValidator.copyContent(source, block);
        if (kind === "group")
        {
            block.items = this.members(source.items);
        }

        if (source.align !== undefined)
        {
            block.align = LayoutValidator.oneOf(source.align, ALIGNMENTS);
        }
        if (source.font !== undefined)
        {
            block.font = LayoutValidator.font(source.font);
        }
        LayoutValidator.copyColor(source, block, "color");
        LayoutValidator.copyColor(source, block, "cardColor");
        LayoutValidator.copyColor(source, block, "backgroundColor");
        if (source.background !== undefined)
        {
            block.background = LayoutValidator.flag(source.background);
        }
        for (const [field, bounds] of Object.entries(BLOCK_NUMBER_BOUNDS))
        {
            LayoutValidator.copyNumber(source, block, field as keyof typeof BLOCK_NUMBER_BOUNDS, bounds);
        }
        return block;
    }

    private members(value: unknown): GroupItem[]
    {
        if (!Array.isArray(value) || value.length < 1 || value.length > MAX_GROUP_MEMBERS)
        {
            throw new InvalidLayout();
        }
        return value.map((memberValue) =>
        {
            const source = LayoutValidator.record(memberValue);
            const member: GroupItem = {
                kind: LayoutValidator.oneOf(source.kind, MEMBER_KINDS),
                display: LayoutValidator.text(source.display, MAX_TEXT_LENGTH),
            };
            LayoutValidator.copyContent(source, member);
            return member;
        });
    }

    // What a block or a group member shows, besides kind and display.
    private static copyContent(source: Record<string, unknown>, target: LayoutBlock | GroupItem): void
    {
        if (source.customFormat !== undefined)
        {
            target.customFormat = LayoutValidator.text(source.customFormat, MAX_TEXT_LENGTH);
        }
        if (source.text !== undefined)
        {
            target.text = LayoutValidator.text(source.text, MAX_TEXT_LENGTH);
        }
        if (source.weatherIcon !== undefined)
        {
            target.weatherIcon = LayoutValidator.flag(source.weatherIcon);
        }
    }

    private static copyColor(source: Record<string, unknown>, block: LayoutBlock, field: "color" | "cardColor" | "backgroundColor"): void
    {
        const value = source[field];
        if (value === undefined)
        {
            return;
        }
        if (typeof value !== "string" || !COLOR_PATTERN.test(value))
        {
            throw new InvalidLayout();
        }
        block[field] = value.toLowerCase();
    }

    // Copies an optional number. `Field` only admits fields of `Target` that hold a number.
    private static copyNumber<Field extends string>(source: Record<string, unknown>, target: Partial<Record<Field, number>>, field: Field, bounds: NumberBounds): void
    {
        const value = source[field];
        if (value === undefined)
        {
            return;
        }
        target[field] = LayoutValidator.number(value, bounds);
    }

    // Per-column or per-row values: at most one entry per track, each a number or null.
    private static copyOverrides(
        source: Record<string, unknown>,
        layout: ClockLayout,
        field: "columnGaps" | "rowGaps" | "columnWidths" | "rowHeights",
        trackCount: number,
        bounds: NumberBounds,
    ): void
    {
        const value = source[field];
        if (value === undefined)
        {
            return;
        }
        if (!Array.isArray(value) || value.length > trackCount)
        {
            throw new InvalidLayout();
        }
        layout[field] = value.map((entry) => (entry === null ? null : LayoutValidator.number(entry, bounds)));
    }

    private static record(value: unknown): Record<string, unknown>
    {
        if (value === null || typeof value !== "object" || Array.isArray(value))
        {
            throw new InvalidLayout();
        }
        return value as Record<string, unknown>;
    }

    private static number(value: unknown, bounds: NumberBounds): number
    {
        if (typeof value !== "number" || !Number.isFinite(value) || value < bounds.min || value > bounds.max)
        {
            throw new InvalidLayout();
        }
        return value;
    }

    private static wholeNumber(value: unknown, bounds: NumberBounds): number
    {
        const number = LayoutValidator.number(value, bounds);
        if (!Number.isInteger(number))
        {
            throw new InvalidLayout();
        }
        return number;
    }

    private static text(value: unknown, maxLength: number): string
    {
        if (typeof value !== "string" || [...value].length > maxLength)
        {
            throw new InvalidLayout();
        }
        return value;
    }

    private static flag(value: unknown): boolean
    {
        if (typeof value !== "boolean")
        {
            throw new InvalidLayout();
        }
        return value;
    }

    private static font(value: unknown): string
    {
        const font = LayoutValidator.text(value, MAX_FONT_LENGTH);
        if (!FONT_PATTERN.test(font))
        {
            throw new InvalidLayout();
        }
        return font;
    }

    private static oneOf<Choice extends string>(value: unknown, choices: Choice[]): Choice
    {
        if (typeof value !== "string" || !choices.includes(value as Choice))
        {
            throw new InvalidLayout();
        }
        return value as Choice;
    }
}
