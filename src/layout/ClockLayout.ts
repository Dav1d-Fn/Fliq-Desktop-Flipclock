// The clock as a grid of blocks, like widgets on a phone home screen. Stored as one JSON value
// (ATOMS.CLOCK_LAYOUT); this file holds only the shapes and the grid rules, no rendering.

export type BlockKind = "flip" | "time" | "date" | "weather" | "text" | "group";

// Kinds a group can hold: everything but another group.
export type MemberKind = Exclude<BlockKind, "group">;

// One member of a group block: only what the member shows. How it looks comes from the group.
export interface GroupItem
{
    kind: MemberKind;
    display: string;
    customFormat?: string;
    text?: string;
    weatherIcon?: boolean;
}

export type BlockAlign = "left" | "center" | "right";

export interface LayoutBlock
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
    // Group blocks only: the members, left to right, and the space between them in em.
    items?: GroupItem[];
    itemGap?: number;
    // Optional values fall back to the clock defaults (font, color) or to BLOCK_DEFAULTS.
    align?: BlockAlign;
    font?: string;
    color?: string;
    // Flip time blocks only.
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
    // Default width of a column / height of a row, in px at scale 1; CELL_WIDTH / CELL_HEIGHT
    // when unset.
    columnWidth?: number;
    rowHeight?: number;
    // Size of column / row i, overriding the default. null or missing: the default.
    columnWidths?: (number | null)[];
    rowHeights?: (number | null)[];
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
};

// Fields that say what a block shows. Everything else besides id and position is its look.
const CONTENT_FIELDS = ["kind", "display", "customFormat", "text", "weatherIcon", "items", "itemGap"] as const;
const PLACEMENT_FIELDS = ["id", "x", "y", "w", "h"] as const;

// What a new installation starts with.
// Flip time on top, a group of date, next sun event and temperature below.
export const DEFAULT_LAYOUT: ClockLayout = {
    columns: 4,
    rows: 2,
    columnGap: 0,
    rowGap: 0,
    rowHeights: [65, 35],
    blocks: [
        { id: 1, kind: "flip", x: 0, y: 0, w: 4, h: 1, display: "HH:mm", cardColor: "#212121ff", padding: 0, letterSpacing: -0.03, textSize: 99 },
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

    constructor(layout: ClockLayout)
    {
        this.layout = layout;
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
            rowHeights: this.layout.rowHeights?.slice(0, rows),
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
        if (blocks.length < 2 || blocks.length !== new Set(blockIds).size)
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
        if (!target || !dropped || target === dropped)
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
        };
        const blocks = this.layout.blocks
            .filter((block) => block.id !== droppedId)
            .map((block) => (block.id === targetId ? group : block));
        return { ...this.layout, blocks };
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
        for (const field of ["customFormat", "text", "weatherIcon"] as const)
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

    // Effective width of a column or height of a row: its own value, else the axis default.
    trackSize(ref: TrackRef): number
    {
        return this.trackOverride(ref) ?? this.defaultTrackSize(ref.axis);
    }

    trackOverride(ref: TrackRef): number | null
    {
        const sizes = ref.axis === "column" ? this.layout.columnWidths : this.layout.rowHeights;
        return sizes?.[ref.index] ?? null;
    }

    defaultTrackSize(axis: GapAxis): number
    {
        return axis === "column" ? this.layout.columnWidth ?? CELL_WIDTH : this.layout.rowHeight ?? CELL_HEIGHT;
    }

    // The layout with one column or row set to its own size, or back to the default with null.
    withTrackSize(ref: TrackRef, value: number | null): ClockLayout
    {
        const count = ref.axis === "column" ? this.layout.columns : this.layout.rows;
        const sizes = this.overridesWith(count, ref.index, value, (index) => this.trackOverride({ axis: ref.axis, index }));
        return ref.axis === "column" ? { ...this.layout, columnWidths: sizes } : { ...this.layout, rowHeights: sizes };
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
