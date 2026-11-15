// The clock as a grid of blocks, like widgets on a phone home screen. Stored as one JSON value
// (ATOMS.CLOCK_LAYOUT); this file holds only the shapes and the grid rules, no rendering.

export type BlockKind = "clock" | "date" | "weather" | "text" | "group";

// Kinds a group can hold: everything but another group.
export type MemberKind = Exclude<BlockKind, "group">;

// How a clock block draws the time. "flip" and "text" were their own block kinds before
// (see LayoutMigration); "progress" shows how far one unit is (the old seconds bar); the others
// are drawn by ClockFace.
export type ClockStyle = "flip" | "text" | "segment" | "dots" | "nixie" | "analogMinimal" | "analogClassic" | "analogFine" | "rings" | "progress";

// Progress style: a bar as wide as the block, a ring, or dots that light up in turn.
export type ProgressShape = "bar" | "ring" | "dots";

// What the progress shows: seconds of the minute, minutes of the hour or hours of the day.
export type ProgressUnit = "minute" | "hour" | "day";

// Jumps once per step (second, or minute for hour and day) or moves on continuously.
export type ProgressMotion = "stepped" | "smooth";

// Progress fields of a block or group member; unset means the old seconds bar
// (bar, minute, smooth).
export interface ProgressFields
{
    progressShape?: ProgressShape;
    progressUnit?: ProgressUnit;
    progressMotion?: ProgressMotion;
}

// A progress bar fills its block's width and has no text, so it cannot join a group.
export function isProgressBar(block: { kind: string; clockStyle?: ClockStyle; progressShape?: ProgressShape }): boolean
{
    return block.kind === "clock" && block.clockStyle === "progress" && (block.progressShape ?? "bar") === "bar";
}

// One member of a group block: only what the member shows. How it looks comes from the group.
export interface GroupItem extends ProgressFields
{
    kind: MemberKind;
    display: string;
    customFormat?: string;
    text?: string;
    weatherIcon?: boolean;
    clockStyle?: ClockStyle;
}

export type BlockAlign = "left" | "center" | "right";

// Where blocks lower than their row sit in it.
export type RowAlign = "top" | "center" | "bottom";

// Weather icons as colored emoji or as flat line icons in the text color.
export type IconStyle = "colored" | "flat";

export type GroupDirection = "row" | "column";

export interface LayoutBlock extends ProgressFields
{
    id: number;
    kind: BlockKind;
    // Top left cell and size, in cells.
    x: number;
    y: number;
    w: number;
    h: number;
    // Id of one of the block kind's display options, or "custom" for customFormat.
    display: string;
    customFormat?: string;
    // Text blocks only.
    text?: string;
    // Weather blocks only: show the weather emoji.
    weatherIcon?: boolean;
    // Clock blocks only: how the time is drawn ("flip" when unset).
    clockStyle?: ClockStyle;
    // Group blocks only: the members in order, the space between them in em, and whether they
    // stand side by side ("row", also when unset) or stacked ("column").
    items?: GroupItem[];
    itemGap?: number;
    direction?: GroupDirection;
    // Optional values fall back to the clock defaults (font, color) or to BLOCK_DEFAULTS.
    align?: BlockAlign;
    // Unset means colored, the look before this setting existed.
    iconStyle?: IconStyle;
    font?: string;
    color?: string;
    // Clock styles other than flip and text; unset means the style's own color.
    // Lit segments, dots and tubes:
    glowColor?: string;
    // Rings: each ring's color, and the time in the middle in % of its own size.
    hourRingColor?: string;
    minuteRingColor?: string;
    secondRingColor?: string;
    labelSize?: number;
    // Analog: dial, hour and minute hands (with marks and numerals), second hand.
    dialColor?: string;
    handColor?: string;
    secondHandColor?: string;
    // Flip clock style only.
    cardColor?: string;
    cardRadius?: number;
    padding?: number;
    // Own card behind the block's content, in front of the clock background.
    background?: boolean;
    backgroundColor?: string;
    backgroundRadius?: number; // px at scale 1
    // Share of the fitted size the content fills, in % (100 = fill the block).
    textSize?: number;
    // Extra space between characters (between flip cards for flip time), in em.
    letterSpacing?: number;
    // Free nudge away from the cells, in px at scale 1. Snapping and collisions ignore it.
    offsetX?: number;
    offsetY?: number;
    // Progress style: fill and track color; bar only: thickness and rounding in px at scale 1.
    barColor?: string;
    barTrackColor?: string;
    barThickness?: number;
    barRadius?: number;
}

export interface ClockLayout
{
    columns: number;
    rows: number;
    blocks: LayoutBlock[];
    // Default space between columns / rows, in px at scale 1; CELL_GAP when unset.
    columnGap?: number;
    rowGap?: number;
    // Space after column / row i, overriding the default. null or missing: the default.
    columnGaps?: (number | null)[];
    rowGaps?: (number | null)[];
    // Default width of a column, in px at scale 1; CELL_WIDTH when unset.
    columnWidth?: number;
    // Width of column i, overriding the default. null or missing: the default.
    columnWidths?: (number | null)[];
    // Rows are as high as their highest block (autoRowHeights) unless set here: height of row
    // i in px at scale 1, null or missing for automatic. Older versions stored rowHeight /
    // rowHeights; those values are stale and ignored, hence the new name.
    rowHeightOverrides?: (number | null)[];
    // Where lower blocks sit in row i. null or missing: center.
    rowAligns?: (RowAlign | null)[];
}

export type GapAxis = "column" | "row";

// One column or row: `axis` and its index. Same shape as a gap.
export type TrackRef = GapRef;

// One boundary between two neighbouring columns or rows: `index` is the one before the gap.
export interface GapRef
{
    axis: GapAxis;
    index: number;
}

// What dropping a block onto another does: join it ("group"), slide in beside it ("before",
// "after"), or go into a new row above or below it ("above", "below").
export type DropZone = "group" | "before" | "after" | "above" | "below";

// Share of a block's width or height, at each edge, where a dropped block goes beside it
// instead of grouping with it. The middle is the rest.
export const EDGE_ZONE = 0.3;

export interface CellRect
{
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface PixelRect
{
    left: number;
    top: number;
    width: number;
    height: number;
}

// Size of one cell and the gap between cells at scale 1, in px. The clock window multiplies them
// with the size setting, the editor with whatever fits its canvas.
export const CELL_WIDTH = 64;
export const CELL_HEIGHT = 56;
export const CELL_GAP = 2;

export const GRID_LIMITS = {
    minColumns: 2,
    maxColumns: 8,
    minRows: 1,
    maxRows: 4,
};

export const BLOCK_DEFAULTS = {
    align: "center" as BlockAlign,
    cardColor: "#1f1f1fff",
    cardRadius: 16, // % of the card width
    padding: 8, // px at scale 1
    backgroundColor: "#3f3f46ff",
    backgroundRadius: 12, // px at scale 1
    itemGap: 0.3, // em
    rowAlign: "center" as RowAlign,
    barTrackColor: "#ffffff26",
    barThickness: 4, // px at scale 1
    barRadius: 2, // px at scale 1
};

// Fields that say what a block shows. Everything else besides id and position is its look.
const CONTENT_FIELDS = ["kind", "display", "customFormat", "text", "weatherIcon", "clockStyle", "progressShape", "progressUnit", "progressMotion", "items", "itemGap", "direction"] as const;
const PLACEMENT_FIELDS = ["id", "x", "y", "w", "h"] as const;

// What a new installation starts with.
// Flip time on top, a group of date, next sun event and temperature below.
export const DEFAULT_LAYOUT: ClockLayout = {
    columns: 4,
    rows: 2,
    columnGap: 0,
    rowGap: 0,
    blocks: [
        { id: 1, kind: "clock", clockStyle: "flip", x: 0, y: 0, w: 4, h: 1, display: "HH:mm", cardColor: "#212121ff", padding: 0, letterSpacing: -0.03, textSize: 99 },
        {
            id: 2,
            kind: "group",
            x: 0,
            y: 1,
            w: 4,
            h: 1,
            display: "group",
            items: [
                { kind: "date", display: "ddd, DD.MM" },
                { kind: "weather", display: "sun", weatherIcon: true },
                { kind: "weather", display: "temp", weatherIcon: true },
            ],
            itemGap: 0.9,
            padding: 0,
            letterSpacing: -0.14,
            textSize: 111,
        },
    ],
};

// Grid rules on one layout: what fits where. Pure, so the editor and the tests share it.
export class LayoutGrid
{
    private readonly layout: ClockLayout;
    // Height of each row in px at scale 1 (see autoRowHeights); CELL_HEIGHT where missing.
    private readonly rowHeights: number[];

    constructor(layout: ClockLayout, rowHeights: number[] = [])
    {
        this.layout = layout;
        this.rowHeights = rowHeights;
    }

    // Height of every row: its override if set, else the natural height of its highest
    // single-row block (px at scale 1, keyed by block id; measured by the clock). Rows without
    // either get CELL_HEIGHT. Blocks higher than an overridden row scale down into it.
    // ponytail: blocks spanning several rows do not size rows, their content fits into what the
    // single-row blocks leave. Spread their height over the rows if layouts need it.
    static autoRowHeights(layout: ClockLayout, blockHeights: Record<number, number>): number[]
    {
        return Array.from({ length: layout.rows }, (_, row) =>
        {
            const override = layout.rowHeightOverrides?.[row];
            if (override !== null && override !== undefined)
            {
                return override;
            }
            const heights = layout.blocks
                .filter((block) => block.y === row && block.h === 1 && blockHeights[block.id] !== undefined)
                .map((block) => blockHeights[block.id]);
            return heights.length > 0 ? Math.max(...heights) : CELL_HEIGHT;
        });
    }

    rowHeightOverride(row: number): number | null
    {
        return this.layout.rowHeightOverrides?.[row] ?? null;
    }

    // The layout with one row set to its own height, or back to automatic with null.
    withRowHeight(row: number, value: number | null): ClockLayout
    {
        const rowHeightOverrides = this.overridesWith(this.layout.rows, row, value, (index) => this.rowHeightOverride(index));
        return { ...this.layout, rowHeightOverrides };
    }

    // Where lower blocks sit in a row.
    rowAlign(row: number): RowAlign
    {
        return this.layout.rowAligns?.[row] ?? BLOCK_DEFAULTS.rowAlign;
    }

    // The layout with one row's alignment set.
    withRowAlign(row: number, align: RowAlign): ClockLayout
    {
        const rowAligns = Array.from({ length: this.layout.rows }, (_, index) => (index === row ? align : this.layout.rowAligns?.[index] ?? null));
        return { ...this.layout, rowAligns };
    }

    // True when the rect lies inside the grid and overlaps no block except `ignoredId`.
    fits(rect: CellRect, ignoredId: number | null = null): boolean
    {
        const { columns, rows, blocks } = this.layout;
        if (rect.x < 0 || rect.y < 0 || rect.w < 1 || rect.h < 1)
        {
            return false;
        }
        if (rect.x + rect.w > columns || rect.y + rect.h > rows)
        {
            return false;
        }
        return blocks.every((block) => block.id === ignoredId || !LayoutGrid.overlap(block, rect));
    }

    // First free spot, row by row, for the first of `sizes` that fits anywhere.
    firstFreeSpot(sizes: { w: number; h: number }[]): CellRect | null
    {
        for (const size of sizes)
        {
            for (let y = 0; y < this.layout.rows; y++)
            {
                for (let x = 0; x < this.layout.columns; x++)
                {
                    const rect = { x, y, w: size.w, h: size.h };
                    if (this.fits(rect))
                    {
                        return rect;
                    }
                }
            }
        }
        return null;
    }

    // The grid at another size. Blocks reaching past the new edge are cut back; a block that
    // lay completely outside moves to a free spot (as large as still fits, down to 1 x 1).
    // Null when such a block finds no room.
    resized(columns: number, rows: number): ClockLayout | null
    {
        const inside: LayoutBlock[] = [];
        const outside: LayoutBlock[] = [];
        for (const block of this.layout.blocks)
        {
            if (block.x < columns && block.y < rows)
            {
                inside.push({ ...block, w: Math.min(block.w, columns - block.x), h: Math.min(block.h, rows - block.y) });
            }
            else
            {
                outside.push(block);
            }
        }

        // Gaps of boundaries that no longer exist are dropped, so a re-added column starts fresh.
        const result: ClockLayout = {
            ...this.layout,
            columns,
            rows,
            blocks: inside,
            columnGaps: this.layout.columnGaps?.slice(0, columns - 1),
            rowGaps: this.layout.rowGaps?.slice(0, rows - 1),
            columnWidths: this.layout.columnWidths?.slice(0, columns),
            rowAligns: this.layout.rowAligns?.slice(0, rows),
            rowHeightOverrides: this.layout.rowHeightOverrides?.slice(0, rows),
        };
        for (const block of outside)
        {
            const sizes = [
                { w: Math.min(block.w, columns), h: Math.min(block.h, rows) },
                { w: Math.min(block.w, columns), h: 1 },
                { w: 1, h: 1 },
            ];
            const spot = new LayoutGrid(result).firstFreeSpot(sizes);
            if (!spot)
            {
                return null;
            }
            result.blocks = [...result.blocks, { ...block, ...spot }];
        }

        // Keep the stored order, so nothing else in the layout changes.
        const order = this.layout.blocks.map((block) => block.id);
        result.blocks.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
        return result;
    }

    // The blocks with these ids sorted left to right, when they share their rows and touch side
    // by side without a hole, so they can become one group. Null otherwise (or fewer than two).
    groupable(blockIds: number[]): LayoutBlock[] | null
    {
        const blocks = this.layout.blocks
            .filter((block) => blockIds.includes(block.id))
            .sort((a, b) => a.x - b.x);
        // A progress bar is no text, it cannot share a line with other members.
        if (blocks.length < 2 || blocks.length !== new Set(blockIds).size || blocks.some(isProgressBar))
        {
            return null;
        }
        const first = blocks[0];
        const touching = blocks.every((block, index) =>
            block.y === first.y && block.h === first.h && (index === 0 || blocks[index - 1].x + blocks[index - 1].w === block.x));
        return touching ? blocks : null;
    }

    // The layout with these blocks merged into one group block over their cells. The members
    // keep what they show; the group takes the look of the leftmost one. Groups among them are
    // flattened into the new one. Null when the blocks are not groupable.
    grouped(blockIds: number[]): ClockLayout | null
    {
        const members = this.groupable(blockIds);
        if (!members)
        {
            return null;
        }
        const first = members[0];
        const last = members[members.length - 1];
        const group: LayoutBlock = {
            ...LayoutGrid.lookOf(first),
            id: this.nextBlockId(),
            kind: "group",
            x: first.x,
            y: first.y,
            w: last.x + last.w - first.x,
            h: first.h,
            display: "group",
            items: members.flatMap((block) => LayoutGrid.itemsOf(block)),
            ...(first.kind === "group" && first.itemGap !== undefined && { itemGap: first.itemGap }),
            ...(first.kind === "group" && first.direction !== undefined && { direction: first.direction }),
        };
        // The group takes the place of its first member in the stored order.
        const placeholderId = this.layout.blocks.find((block) => blockIds.includes(block.id))?.id;
        const blocks = this.layout.blocks
            .filter((block) => block.id === placeholderId || !blockIds.includes(block.id))
            .map((block) => (block.id === placeholderId ? group : block));
        return { ...this.layout, blocks };
    }

    // The layout after a block was dropped onto another (drag and drop in the editor): the
    // target becomes a group on its own cells, or stays one, and gets the dropped block's
    // members before or after its own. The target keeps its look; the dropped block is removed.
    mergedInto(targetId: number, droppedId: number, before: boolean): ClockLayout | null
    {
        const target = this.layout.blocks.find((block) => block.id === targetId);
        const dropped = this.layout.blocks.find((block) => block.id === droppedId);
        if (!target || !dropped || target === dropped || isProgressBar(target) || isProgressBar(dropped))
        {
            return null;
        }
        const own = LayoutGrid.itemsOf(target);
        const added = LayoutGrid.itemsOf(dropped);
        const group: LayoutBlock = {
            ...LayoutGrid.lookOf(target),
            id: target.id,
            kind: "group",
            x: target.x,
            y: target.y,
            w: target.w,
            h: target.h,
            display: "group",
            items: before ? [...added, ...own] : [...own, ...added],
            ...(target.itemGap !== undefined && { itemGap: target.itemGap }),
            ...(target.direction !== undefined && { direction: target.direction }),
        };
        const blocks = this.layout.blocks
            .filter((block) => block.id !== droppedId)
            .map((block) => (block.id === targetId ? group : block));
        return { ...this.layout, blocks };
    }

    // What a block dropped onto `target` does, from where the pointer is on the target (shares
    // of its width and height): an edge band slides the dropped block in beside it, or into a
    // new row above or below it; the middle groups them. Zones that cannot happen give way to
    // the others; null when none can.
    static dropZone(target: LayoutBlock, dropped: LayoutBlock, shareX: number, shareY = 0.5, canAddRow = false): DropZone | null
    {
        const canGroup = !isProgressBar(target) && !isProgressBar(dropped);
        // Distance to every edge that can take the block. On a tie the first one wins.
        const edges: [DropZone, number][] = [];
        if (target.h === dropped.h)
        {
            edges.push(["after", 1 - shareX], ["before", shareX]);
        }
        if (canAddRow)
        {
            edges.push(["below", 1 - shareY], ["above", shareY]);
        }
        const nearest = edges.reduce<[DropZone, number] | null>((best, edge) => (best === null || edge[1] < best[1] ? edge : best), null);
        if (nearest && (nearest[1] < EDGE_ZONE || !canGroup))
        {
            return nearest[0];
        }
        return canGroup ? "group" : null;
    }

    // The layout with a block slid in before or after `target`, on the target's rows. The
    // blocks of that line (same rows as the target) make room by sliding left or right, keeping
    // their order and skipping cells other blocks hold; whichever way moves less wins. When the
    // line is full, its widest blocks give up a column at a time (never below one). Rows the
    // dropped block leaves empty are removed. Null when even that leaves no room.
    withBlockInserted(targetId: number, droppedId: number, before: boolean): ClockLayout | null
    {
        const target = this.layout.blocks.find((block) => block.id === targetId);
        const dropped = this.layout.blocks.find((block) => block.id === droppedId);
        if (!target || !dropped || target === dropped || target.h !== dropped.h)
        {
            return null;
        }
        const inLine = (block: LayoutBlock) => block.id !== droppedId && block.y === target.y && block.h === target.h;
        const line = this.layout.blocks.filter(inLine).sort((a, b) => a.x - b.x);
        const blocked = new Set<number>();
        for (const block of this.layout.blocks)
        {
            const crossesLine = block.y < target.y + target.h && target.y < block.y + block.h;
            if (block.id !== droppedId && !inLine(block) && crossesLine)
            {
                for (let column = block.x; column < block.x + block.w; column++)
                {
                    blocked.add(column);
                }
            }
        }
        const widths = new Map(line.map((block) => [block.id, block.w]));
        for (;;)
        {
            const placed = this.lineWithBlock(line.map((block) => ({ ...block, w: widths.get(block.id)! })), target, dropped, before, blocked);
            if (placed)
            {
                return placed;
            }
            const widest = line.reduce((wide, block) => (widths.get(block.id)! > widths.get(wide.id)! ? block : wide));
            if (widths.get(widest.id)! <= 1)
            {
                return null;
            }
            widths.set(widest.id, widths.get(widest.id)! - 1);
        }
    }

    // withBlockInserted with the line at the given widths. Null when it does not fit.
    private lineWithBlock(line: LayoutBlock[], target: LayoutBlock, dropped: LayoutBlock, before: boolean, blocked: Set<number>): ClockLayout | null
    {
        const targetIndex = line.findIndex((block) => block.id === target.id);
        const insertAt = targetIndex + (before ? 0 : 1);
        const sequence = [...line.slice(0, insertAt), { ...dropped, y: target.y }, ...line.slice(insertAt)];
        const anchor = before ? target.x : target.x + line[targetIndex].w;
        const placements = [this.slid(sequence, insertAt, anchor, 1, blocked), this.slid(sequence, insertAt, anchor, -1, blocked)]
            .filter((placement): placement is Map<number, number> => placement !== null);
        if (placements.length === 0)
        {
            return null;
        }
        // Distance every block travels, the dropped one included, so its old spot gets filled.
        const travel = (placement: Map<number, number>) => [...placement].reduce((sum, [id, x]) =>
        {
            const original = this.layout.blocks.find((block) => block.id === id)!;
            return sum + Math.abs(original.x - x) + Math.abs(original.y - (id === dropped.id ? target.y : original.y));
        }, 0);
        const best = placements.reduce((shortest, placement) => (travel(placement) < travel(shortest) ? placement : shortest));
        const widths = new Map(line.map((block) => [block.id, block.w]));
        const blocks = this.layout.blocks.map((block) =>
        {
            const w = widths.get(block.id) ?? block.w;
            const x = best.get(block.id);
            if (x === undefined)
            {
                return { ...block, w };
            }
            return block.id === dropped.id ? { ...block, x, y: target.y } : { ...block, x, w };
        });
        const leftRows = Array.from({ length: dropped.h }, (_, offset) => dropped.y + offset);
        return LayoutGrid.withoutEmptyRows({ ...this.layout, blocks }, leftRows);
    }

    // The layout with a new row above or below `target`'s rows, holding the dropped block (one
    // row high, at its own columns if they are free there, else the first free ones, as wide as
    // still fits). Rows from there on move down; blocks reaching across the new row grow over
    // it. Rows the dropped block leaves empty are removed. Null when no columns are free in the
    // new row or the grid would get more rows than allowed.
    withBlockInNewRow(targetId: number, droppedId: number, below: boolean): ClockLayout | null
    {
        const target = this.layout.blocks.find((block) => block.id === targetId);
        const dropped = this.layout.blocks.find((block) => block.id === droppedId);
        if (!target || !dropped || target === dropped)
        {
            return null;
        }
        const { columns, rows } = this.layout;
        const row = below ? target.y + target.h : target.y;
        const shifted = (block: LayoutBlock): LayoutBlock =>
        {
            if (block.y >= row)
            {
                return { ...block, y: block.y + 1 };
            }
            return block.y + block.h > row ? { ...block, h: block.h + 1 } : block;
        };
        let layout: ClockLayout = {
            ...this.layout,
            rows: rows + 1,
            blocks: this.layout.blocks.filter((block) => block.id !== droppedId).map(shifted),
            rowGaps: LayoutGrid.spliced(this.layout.rowGaps, rows - 1, row, 0, null),
            rowAligns: LayoutGrid.spliced(this.layout.rowAligns, rows, row, 0, null),
            rowHeightOverrides: LayoutGrid.spliced(this.layout.rowHeightOverrides, rows, row, 0, null),
        };
        const roomy = new LayoutGrid(layout);
        const ownColumns = { x: Math.min(dropped.x, columns - Math.min(dropped.w, columns)), y: row, w: Math.min(dropped.w, columns), h: 1 };
        let spot: CellRect | null = roomy.fits(ownColumns) ? ownColumns : null;
        for (let w = ownColumns.w; w >= 1 && !spot; w--)
        {
            for (let x = 0; x + w <= columns && !spot; x++)
            {
                spot = roomy.fits({ x, y: row, w, h: 1 }) ? { x, y: row, w, h: 1 } : null;
            }
        }
        if (!spot)
        {
            return null;
        }
        // Keep the stored order, so nothing else in the layout changes.
        layout.blocks = this.layout.blocks.map((block) => (block.id === droppedId ? { ...block, ...spot } : layout.blocks.find((other) => other.id === block.id)!));

        const oldRows = Array.from({ length: dropped.h }, (_, offset) => dropped.y + offset + (dropped.y + offset >= row ? 1 : 0));
        layout = LayoutGrid.withoutEmptyRows(layout, oldRows);
        return layout.rows <= GRID_LIMITS.maxRows ? layout : null;
    }

    // The layout without those of `rows` that no block covers (rows a moved block left behind),
    // never below the smallest grid.
    private static withoutEmptyRows(layout: ClockLayout, rows: number[]): ClockLayout
    {
        let result = layout;
        // Bottom up, so the indices still to check stay put.
        for (const row of [...rows].sort((a, b) => b - a))
        {
            const empty = result.blocks.every((block) => row < block.y || row >= block.y + block.h);
            if (empty && result.rows > GRID_LIMITS.minRows)
            {
                result = LayoutGrid.withoutRow(result, row);
            }
        }
        return result;
    }

    // The layout without one empty row: the rows below move up, its gap and alignment go.
    private static withoutRow(layout: ClockLayout, row: number): ClockLayout
    {
        return {
            ...layout,
            rows: layout.rows - 1,
            blocks: layout.blocks.map((block) => (block.y > row ? { ...block, y: block.y - 1 } : block)),
            rowGaps: LayoutGrid.spliced(layout.rowGaps, layout.rows - 1, Math.min(row, layout.rows - 2), 1),
            rowAligns: LayoutGrid.spliced(layout.rowAligns, layout.rows, row, 1),
            rowHeightOverrides: LayoutGrid.spliced(layout.rowHeightOverrides, layout.rows, row, 1),
        };
    }

    // A per-row (or per-gap) override list of `count` entries with entries removed or added at
    // `index`, like Array.splice. Stays undefined when there was none.
    private static spliced<T>(values: (T | null)[] | undefined, count: number, index: number, deleteCount: number, ...added: (T | null)[]): (T | null)[] | undefined
    {
        if (!values)
        {
            return undefined;
        }
        const padded: (T | null)[] = Array.from({ length: count }, (_, valueIndex) => values[valueIndex] ?? null);
        padded.splice(index, deleteCount, ...added);
        return padded;
    }

    // New x of the blocks from `start` onwards (direction 1) or from `start` back (direction
    // -1), packed against the anchor in that direction; the others stay. The block at `start`
    // starts (or ends, going left) at the anchor. Null when they run out of the grid.
    private slid(sequence: LayoutBlock[], start: number, anchor: number, direction: 1 | -1, blocked: Set<number>): Map<number, number> | null
    {
        const placement = new Map<number, number>();
        const isFree = (x: number, w: number) =>
        {
            for (let column = x; column < x + w; column++)
            {
                if (blocked.has(column))
                {
                    return false;
                }
            }
            return true;
        };
        let cursor = anchor;
        if (direction === 1)
        {
            for (let index = start; index < sequence.length; index++)
            {
                const block = sequence[index];
                let x = index === start ? cursor : Math.max(block.x, cursor);
                while (x + block.w <= this.layout.columns && !isFree(x, block.w))
                {
                    x++;
                }
                if (x + block.w > this.layout.columns)
                {
                    return null;
                }
                placement.set(block.id, x);
                cursor = x + block.w;
            }
        }
        else
        {
            for (let index = start; index >= 0; index--)
            {
                const block = sequence[index];
                let end = index === start ? cursor : Math.min(block.x + block.w, cursor);
                while (end - block.w >= 0 && !isFree(end - block.w, block.w))
                {
                    end--;
                }
                if (end - block.w < 0)
                {
                    return null;
                }
                placement.set(block.id, end - block.w);
                cursor = end - block.w;
            }
        }
        // The blocks that keep their spot lie on the other side of the anchor, so none collide.
        return placement;
    }

    // The layout with a group member swapped with its neighbour (step -1: left, 1: right).
    // Null when there is no neighbour on that side.
    withMemberMoved(groupId: number, index: number, step: number): ClockLayout | null
    {
        const group = this.layout.blocks.find((block) => block.id === groupId);
        const items = [...(group?.items ?? [])];
        const other = index + step;
        if (!group || index < 0 || index >= items.length || other < 0 || other >= items.length)
        {
            return null;
        }
        [items[index], items[other]] = [items[other], items[index]];
        return { ...this.layout, blocks: this.layout.blocks.map((block) => (block.id === groupId ? { ...group, items } : block)) };
    }

    // The layout with one member taken out of a group as a block of its own, with the group's
    // look, on the first free spot of `sizes`. A group left with one member turns back into a
    // plain block. Null when the grid has no free spot.
    withMemberDetached(groupId: number, index: number, sizes: { w: number; h: number }[]): { layout: ClockLayout; blockId: number } | null
    {
        const group = this.layout.blocks.find((block) => block.id === groupId);
        const items = group?.items ?? [];
        const spot = this.firstFreeSpot(sizes);
        if (!group || index < 0 || index >= items.length || items.length < 2 || !spot)
        {
            return null;
        }
        const look = LayoutGrid.lookOf(group);
        const blockId = this.nextBlockId();
        const detached: LayoutBlock = { ...look, ...items[index], id: blockId, ...spot };
        const rest = items.filter((_, itemIndex) => itemIndex !== index);
        const placement = { id: group.id, x: group.x, y: group.y, w: group.w, h: group.h };
        const remaining: LayoutBlock = rest.length === 1
            ? { ...look, ...rest[0], ...placement }
            : { ...group, items: rest };
        const blocks = this.layout.blocks.map((block) => (block.id === groupId ? remaining : block));
        return { layout: { ...this.layout, blocks: [...blocks, detached] }, blockId };
    }

    // The layout with a group split back into one block per member, side by side over the
    // group's cells, widths as even as possible, each with the group's look. Null when the
    // group is narrower than it has members.
    ungrouped(groupId: number): ClockLayout | null
    {
        const group = this.layout.blocks.find((block) => block.id === groupId);
        const items = group?.kind === "group" ? group.items ?? [] : [];
        if (!group || items.length === 0 || items.length > group.w)
        {
            return null;
        }
        const look = LayoutGrid.lookOf(group);
        let nextId = this.nextBlockId();
        let x = group.x;
        const members = items.map((item, index): LayoutBlock =>
        {
            const w = Math.floor(group.w / items.length) + (index < group.w % items.length ? 1 : 0);
            const block = { ...look, ...item, id: nextId++, x, y: group.y, w, h: group.h };
            x += w;
            return block;
        });
        const blocks = this.layout.blocks.flatMap((block) => (block.id === groupId ? members : [block]));
        return { ...this.layout, blocks };
    }

    // What a block shows, as group members: a group's own members, or the block itself.
    static itemsOf(block: LayoutBlock): GroupItem[]
    {
        if (block.kind === "group")
        {
            return block.items ?? [];
        }
        const item: GroupItem = { kind: block.kind, display: block.display };
        for (const field of ["customFormat", "text", "weatherIcon", "clockStyle", "progressShape", "progressUnit", "progressMotion"] as const)
        {
            if (block[field] !== undefined)
            {
                Object.assign(item, { [field]: block[field] });
            }
        }
        return [item];
    }

    // The look of a block: every field except what it shows and where it sits.
    static lookOf(block: LayoutBlock): Partial<LayoutBlock>
    {
        const skipped: readonly string[] = [...CONTENT_FIELDS, ...PLACEMENT_FIELDS];
        return Object.fromEntries(Object.entries(block).filter(([field]) => !skipped.includes(field)));
    }

    nextBlockId(): number
    {
        return this.layout.blocks.reduce((highest, block) => Math.max(highest, block.id), 0) + 1;
    }

    // Snapped target of a move by (deltaX, deltaY) px at scale 1, kept inside the grid: the
    // column and row whose start lies closest to where the block's corner was dropped.
    moveTarget(block: LayoutBlock, deltaX: number, deltaY: number): CellRect
    {
        const x = this.nearest(0, this.layout.columns - block.w, (column) => this.columnStart(column), this.columnStart(block.x) + deltaX);
        const y = this.nearest(0, this.layout.rows - block.h, (row) => this.rowStart(row), this.rowStart(block.y) + deltaY);
        return { x, y, w: block.w, h: block.h };
    }

    // Snapped target of pulling the right edge, the bottom edge or both by (deltaX, deltaY):
    // the size whose far edge lies closest to the pulled one.
    resizeTarget(block: LayoutBlock, edges: "right" | "bottom" | "corner", deltaX: number, deltaY: number): CellRect
    {
        let w = block.w;
        let h = block.h;
        if (edges !== "bottom")
        {
            const end = this.columnEnd(block.x + block.w - 1) + deltaX;
            w = this.nearest(1, this.layout.columns - block.x, (width) => this.columnEnd(block.x + width - 1), end);
        }
        if (edges !== "right")
        {
            const end = this.rowEnd(block.y + block.h - 1) + deltaY;
            h = this.nearest(1, this.layout.rows - block.y, (height) => this.rowEnd(block.y + height - 1), end);
        }
        return { x: block.x, y: block.y, w, h };
    }

    pixelRect(rect: CellRect, scale: number): PixelRect
    {
        const left = this.columnStart(rect.x);
        const top = this.rowStart(rect.y);
        return {
            left: left * scale,
            top: top * scale,
            width: (this.columnEnd(rect.x + rect.w - 1) - left) * scale,
            height: (this.rowEnd(rect.y + rect.h - 1) - top) * scale,
        };
    }

    size(scale: number): { width: number; height: number }
    {
        const { width, height } = this.pixelRect({ x: 0, y: 0, w: this.layout.columns, h: this.layout.rows }, 1);
        return { width: width * scale, height: height * scale };
    }

    // Effective space after one column or row: its own value, else the axis default.
    gap(ref: GapRef): number
    {
        return this.gapOverride(ref) ?? this.defaultGap(ref.axis);
    }

    gapOverride(ref: GapRef): number | null
    {
        const gaps = ref.axis === "column" ? this.layout.columnGaps : this.layout.rowGaps;
        return gaps?.[ref.index] ?? null;
    }

    defaultGap(axis: GapAxis): number
    {
        return (axis === "column" ? this.layout.columnGap : this.layout.rowGap) ?? CELL_GAP;
    }

    // The layout with one gap set to its own value, or back to the default with null.
    withGap(ref: GapRef, value: number | null): ClockLayout
    {
        const count = (ref.axis === "column" ? this.layout.columns : this.layout.rows) - 1;
        const gaps = this.overridesWith(count, ref.index, value, (index) => this.gapOverride({ axis: ref.axis, index }));
        return ref.axis === "column" ? { ...this.layout, columnGaps: gaps } : { ...this.layout, rowGaps: gaps };
    }

    // Width of a column (its own value, else the default) or height of a row (see autoRowHeights).
    trackSize(ref: TrackRef): number
    {
        if (ref.axis === "row")
        {
            return this.rowHeights[ref.index] ?? CELL_HEIGHT;
        }
        return this.columnWidthOverride(ref.index) ?? this.defaultColumnWidth();
    }

    columnWidthOverride(column: number): number | null
    {
        return this.layout.columnWidths?.[column] ?? null;
    }

    defaultColumnWidth(): number
    {
        return this.layout.columnWidth ?? CELL_WIDTH;
    }

    // The layout with one column set to its own width, or back to the default with null.
    withColumnWidth(column: number, value: number | null): ClockLayout
    {
        const columnWidths = this.overridesWith(this.layout.columns, column, value, (index) => this.columnWidthOverride(index));
        return { ...this.layout, columnWidths };
    }

    // Left edge of a column, in px at scale 1.
    columnStart(column: number): number
    {
        let start = 0;
        for (let index = 0; index < column; index++)
        {
            start += this.trackSize({ axis: "column", index }) + this.gap({ axis: "column", index });
        }
        return start;
    }

    // Right edge of a column, in px at scale 1.
    columnEnd(column: number): number
    {
        return this.columnStart(column) + this.trackSize({ axis: "column", index: column });
    }

    // Top edge of a row, in px at scale 1.
    rowStart(row: number): number
    {
        let start = 0;
        for (let index = 0; index < row; index++)
        {
            start += this.trackSize({ axis: "row", index }) + this.gap({ axis: "row", index });
        }
        return start;
    }

    // Bottom edge of a row, in px at scale 1.
    rowEnd(row: number): number
    {
        return this.rowStart(row) + this.trackSize({ axis: "row", index: row });
    }

    // Sparse overrides with one entry changed: only that entry is written, all others stay
    // as they are (null when they follow the default).
    private overridesWith(count: number, changed: number, value: number | null, current: (index: number) => number | null): (number | null)[]
    {
        return Array.from({ length: count }, (_, index) => (index === changed ? value : current(index)));
    }

    // The value in [min, max] whose position lies closest to `target`.
    private nearest(min: number, max: number, position: (value: number) => number, target: number): number
    {
        let best = min;
        for (let value = min + 1; value <= max; value++)
        {
            if (Math.abs(position(value) - target) < Math.abs(position(best) - target))
            {
                best = value;
            }
        }
        return best;
    }

    private static overlap(a: CellRect, b: CellRect): boolean
    {
        return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    }
}
