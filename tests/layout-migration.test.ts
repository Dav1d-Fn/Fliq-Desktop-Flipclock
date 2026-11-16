// Runs with `npm test` (node --test, no extra dependency).
import { test } from "node:test";
import assert from "node:assert/strict";
import { LayoutMigration } from "../src/layout/LayoutMigration.ts";
import { CELL_HEIGHT, LayoutGrid, type ClockLayout, type LayoutBlock } from "../src/layout/ClockLayout.ts";
import { blockDefinition } from "../src/blocks/BlockRegistry.ts";
import { DEFAULT_SEGMENT_CONTEXT, timeFormat } from "../src/blocks/BlockDefinition.ts";
import { progressShare } from "../src/clock/ProgressShare.ts";

function storage(values: Record<string, unknown>)
{
    const items = new Map(Object.entries(values).map(([key, value]) => [key, JSON.stringify(value)]));
    return {
        items,
        getItem: (key: string) => items.get(key) ?? null,
        setItem: (key: string, value: string) =>
        {
            items.set(key, value);
        },
    };
}

const layoutOf = (store: ReturnType<typeof storage>): ClockLayout => JSON.parse(store.items.get("clockLayout")!);

test("old rows become one grid row each, one block per placeholder", () =>
{
    const store = storage({
        format: "$FLIPTIME(HH:mm)",
        secondRowEnabled: true,
        secondRowFormat: "$TIME(dddd, DD.MM) $TEXT( ) $WEATHER(feelsLikeEmoji) $TEXT( ) $WEATHER(nextSun)",
        flipCardBackground: "#ff0000ff",
    });
    new LayoutMigration(store).run();
    const layout = layoutOf(store);

    assert.equal(layout.rows, 2);
    assert.equal(layout.columns, 6);
    const [flip, date, feels, sun] = layout.blocks;
    assert.deepEqual([flip.kind, flip.clockStyle, flip.textStyle, flip.display, flip.x, flip.y, flip.w], ["clock", undefined, "flip", "HH:mm", 0, 0, 6]);
    assert.equal(flip.cardColor, "#ff0000ff");
    assert.deepEqual([date.kind, date.display, date.customFormat], ["date", "custom", "dddd, DD.MM"]);
    assert.deepEqual([feels.kind, feels.display, feels.weatherIcon], ["weather", "feels", true]);
    assert.deepEqual([sun.kind, sun.display], ["weather", "sun"]);
    assert.equal(date.w + feels.w + sun.w, 6);
    for (const block of layout.blocks)
    {
        assert.ok(new LayoutGrid(layout).fits(block, block.id), `block ${block.id} overlaps or sticks out`);
    }
});

test("runs once: a reset afterwards starts with the default layout", () =>
{
    const store = storage({ format: "$FLIPTIME(HH:mm)" });
    new LayoutMigration(store).run();
    store.items.delete("clockLayout");
    new LayoutMigration(store).run();
    assert.equal(store.items.has("clockLayout"), false);
});

test("an untouched installation gets no converted layout", () =>
{
    const store = storage({ textColor: "#ffffffff" });
    new LayoutMigration(store).run();
    assert.equal(store.items.has("clockLayout"), false);
});

test("widths fill the row, every block at least one cell", () =>
{
    assert.deepEqual(LayoutMigration.splitWidths([10, 2, 2], 6), [4, 1, 1]);
    assert.deepEqual(LayoutMigration.splitWidths([1, 1, 1, 1, 1, 1], 6), [1, 1, 1, 1, 1, 1]);
});

test("grid: fits, free spot, removable column, snapped move", () =>
{
    const layout: ClockLayout = {
        columns: 3,
        rows: 2,
        blocks: [{ id: 1, kind: "text", x: 0, y: 0, w: 2, h: 1, display: "text" }],
    };
    const grid = new LayoutGrid(layout);
    assert.equal(grid.fits({ x: 1, y: 0, w: 1, h: 1 }), false);
    assert.equal(grid.fits({ x: 1, y: 0, w: 1, h: 1 }, 1), true);
    assert.deepEqual(grid.firstFreeSpot([{ w: 2, h: 2 }, { w: 1, h: 1 }]), { x: 2, y: 0, w: 1, h: 1 });
    assert.deepEqual(grid.moveTarget(layout.blocks[0], 80, 200), { x: 1, y: 1, w: 2, h: 1 });
    assert.deepEqual(grid.resizeTarget(layout.blocks[0], "corner", 500, 70), { x: 0, y: 0, w: 3, h: 2 });
});

test("grid: shrinking cuts blocks back and moves the ones left outside", () =>
{
    const layout: ClockLayout = {
        columns: 4,
        rows: 2,
        blocks: [
            { id: 1, kind: "clock", x: 0, y: 0, w: 4, h: 1, display: "HH:mm" },
            { id: 2, kind: "text", x: 3, y: 1, w: 1, h: 1, display: "text" },
        ],
    };
    const smaller = new LayoutGrid(layout).resized(3, 2)!;
    assert.deepEqual(smaller.blocks.map((block) => [block.id, block.x, block.y, block.w, block.h]), [[1, 0, 0, 3, 1], [2, 0, 1, 1, 1]]);
    // One row: the text block finds no room next to the full-width flip block.
    assert.equal(new LayoutGrid(layout).resized(4, 1), null);
});

test("grid: variable gaps move cells, size and snapping; missing gaps use 2 px", () =>
{
    const layout: ClockLayout = {
        columns: 3,
        rows: 2,
        columnGaps: [0, 40],
        blocks: [{ id: 1, kind: "text", x: 0, y: 0, w: 1, h: 1, display: "text" }],
    };
    const grid = new LayoutGrid(layout);
    // Columns start at 0, 64 (no gap) and 168 (64 + 64 + 40); rows keep the default 2 px.
    assert.deepEqual(grid.pixelRect({ x: 1, y: 1, w: 2, h: 1 }, 1), { left: 64, top: 58, width: 168, height: 56 });
    assert.deepEqual(grid.pixelRect({ x: 2, y: 0, w: 1, h: 1 }, 0.5), { left: 84, top: 0, width: 32, height: 28 });
    assert.deepEqual(grid.size(1), { width: 232, height: 114 });
    assert.deepEqual(new LayoutGrid({ ...layout, columnGaps: undefined }).size(1), { width: 196, height: 114 });
    // 150 px right lands nearer the start of column 2 (168) than of column 1 (64).
    assert.deepEqual(grid.moveTarget(layout.blocks[0], 150, 0), { x: 2, y: 0, w: 1, h: 1 });
    assert.deepEqual(grid.moveTarget(layout.blocks[0], 100, 0), { x: 1, y: 0, w: 1, h: 1 });
    // Right edge pulled from 64 to 200: nearer the end of column 2 (232) than of column 1 (128).
    assert.deepEqual(grid.resizeTarget(layout.blocks[0], "right", 136, 0), { x: 0, y: 0, w: 3, h: 1 });

    const changed = grid.withGap({ axis: "row", index: 0 }, 20);
    assert.deepEqual(changed.rowGaps, [20]);
    assert.deepEqual(changed.columnGaps, [0, 40]);
    assert.equal(new LayoutGrid(changed).size(1).height, 132);
    // Removing the last column drops its gap; the remaining one is kept.
    assert.deepEqual(grid.resized(2, 2)!.columnGaps, [0]);
});

test("grid: gap defaults per axis, single gaps override them until reset", () =>
{
    const layout: ClockLayout = { columns: 3, rows: 2, columnGap: 10, rowGap: 6, columnGaps: [null, 40], blocks: [] };
    const grid = new LayoutGrid(layout);
    assert.equal(grid.columnStart(1), 74);
    assert.equal(grid.columnStart(2), 178);
    assert.equal(grid.rowStart(1), 62);
    assert.equal(grid.gapOverride({ axis: "column", index: 0 }), null);

    const reset = grid.withGap({ axis: "column", index: 1 }, null);
    assert.deepEqual(reset.columnGaps, [null, null]);
    assert.equal(new LayoutGrid(reset).columnStart(2), 148);
    // A new default moves every gap that has no own value.
    assert.equal(new LayoutGrid({ ...layout, columnGap: 0 }).columnStart(2), 168);
});

test("grid: column widths follow their default until set apart, rows their highest block", () =>
{
    // Gaps 2 px. Columns 64, 100, 64; rows 40, 40 (measured), an old stored row height is ignored.
    const layout = { columns: 3, rows: 2, rowHeight: 99, columnWidths: [null, 100], blocks: [] } as ClockLayout;
    const grid = new LayoutGrid(layout, [40, 40]);
    assert.equal(grid.columnStart(2), 64 + 2 + 100 + 2);
    assert.deepEqual(grid.pixelRect({ x: 1, y: 0, w: 2, h: 2 }, 1), { left: 66, top: 0, width: 166, height: 82 });
    assert.deepEqual(grid.size(1), { width: 232, height: 82 });
    // Resize snaps to the far edge of the wide column.
    assert.equal(grid.resizeTarget({ id: 1, kind: "text", x: 0, y: 0, w: 1, h: 1, display: "text" }, "right", 100, 0).w, 2);

    const reset = grid.withColumnWidth(1, null);
    assert.deepEqual(reset.columnWidths, [null, null, null]);
    assert.equal(new LayoutGrid(reset).columnEnd(2), 64 * 3 + 4);
    // A removed column drops its own width.
    assert.deepEqual(grid.resized(1, 2)?.columnWidths, [null]);
});

test("grid: a row is as high as its highest single-row block, empty rows keep the cell height", () =>
{
    const blocks: LayoutBlock[] = [
        { id: 1, kind: "clock", x: 0, y: 0, w: 3, h: 1, display: "HH:mm" },
        { id: 2, kind: "clock", x: 3, y: 0, w: 1, h: 1, display: "ss" },
        { id: 3, kind: "clock", clockStyle: "progress", x: 0, y: 1, w: 4, h: 1, display: "bar" },
        { id: 4, kind: "text", x: 0, y: 2, w: 1, h: 2, display: "text" },
    ];
    const layout: ClockLayout = { columns: 4, rows: 4, blocks, rowAligns: [null, "bottom"] };
    const heights = LayoutGrid.autoRowHeights(layout, { 1: 90, 2: 50, 3: 8, 4: 300 });
    assert.deepEqual(heights, [90, 8, CELL_HEIGHT, CELL_HEIGHT]);

    const grid = new LayoutGrid(layout, heights);
    assert.equal(grid.rowAlign(0), "center");
    assert.equal(grid.rowAlign(1), "bottom");
    assert.deepEqual(grid.withRowAlign(0, "bottom").rowAligns, ["bottom", "bottom", null, null]);
    // A seconds bar joins no group.
    assert.equal(grid.groupable([1, 2]) !== null, true);
    assert.equal(new LayoutGrid({ ...layout, blocks: [blocks[2], { ...blocks[3], y: 1, x: 4, h: 1 }], columns: 5 }).groupable([3, 4]), null);
    assert.equal(grid.mergedInto(1, 3, false), null);
});

test("grid: a row height override wins over its blocks, null goes back to automatic", () =>
{
    const blocks: LayoutBlock[] = [
        { id: 1, kind: "clock", x: 0, y: 0, w: 2, h: 1, display: "HH:mm" },
        { id: 2, kind: "text", x: 0, y: 1, w: 2, h: 1, display: "text" },
    ];
    // Stale values of older versions stay ignored.
    const layout = { columns: 2, rows: 3, blocks, rowHeight: 99, rowHeights: [99, 99, 99] } as ClockLayout;
    const measured = { 1: 90, 2: 30 };
    assert.deepEqual(LayoutGrid.autoRowHeights(layout, measured), [90, 30, CELL_HEIGHT]);

    // Lower than the block (its content scales down) and higher than an empty row.
    const overridden = new LayoutGrid(layout).withRowHeight(0, 40);
    const raised = new LayoutGrid(overridden).withRowHeight(2, 120);
    assert.deepEqual(raised.rowHeightOverrides, [40, null, 120]);
    assert.deepEqual(LayoutGrid.autoRowHeights(raised, measured), [40, 30, 120]);
    assert.equal(new LayoutGrid(raised).rowHeightOverride(1), null);

    const reset = new LayoutGrid(raised).withRowHeight(0, null);
    assert.deepEqual(LayoutGrid.autoRowHeights(reset, measured), [90, 30, 120]);
    // A removed row drops its own height.
    assert.deepEqual(new LayoutGrid(raised).resized(2, 2)?.rowHeightOverrides, [40, null]);
});

test("once: gap values of earlier built-in defaults follow the defaults again", () =>
{
    const store = storage({
        layoutMigrated: true,
        clockLayout: { columns: 4, rows: 2, blocks: [], columnGaps: [2, 8, 30], rowGaps: [0], columnGap: 11, rowGap: 16 },
    });
    new LayoutMigration(store).run();
    const layout = layoutOf(store);
    assert.deepEqual(layout.columnGaps, [null, null, 30]);
    assert.deepEqual(layout.rowGaps, [0]);
    assert.equal(new LayoutGrid(layout).gap({ axis: "column", index: 0 }), 11);

    // Runs once: a value of 2 set later is kept.
    store.setItem("clockLayout", JSON.stringify({ ...layout, columnGaps: [2, null, 30] }));
    new LayoutMigration(store).run();
    assert.deepEqual(layoutOf(store).columnGaps, [2, null, 30]);
});

const rowLayout = (): ClockLayout => ({
    columns: 6,
    rows: 2,
    blocks: [
        { id: 1, kind: "clock", x: 0, y: 0, w: 6, h: 1, display: "HH:mm" },
        { id: 2, kind: "date", x: 0, y: 1, w: 2, h: 1, display: "custom", customFormat: "dddd", textSize: 80, color: "#ff0000ff" },
        { id: 3, kind: "weather", x: 2, y: 1, w: 1, h: 1, display: "feels", weatherIcon: false, textSize: 120 },
        { id: 4, kind: "weather", x: 3, y: 1, w: 3, h: 1, display: "sun" },
    ],
});

test("blocks side by side in one row become one group with the leftmost block's look", () =>
{
    const grouped = new LayoutGrid(rowLayout()).grouped([4, 2, 3])!;
    assert.deepEqual(grouped.blocks.map((block) => block.id), [1, 5]);
    const group = grouped.blocks[1];
    assert.deepEqual([group.kind, group.x, group.y, group.w, group.h], ["group", 0, 1, 6, 1]);
    assert.deepEqual([group.textSize, group.color], [80, "#ff0000ff"]);
    assert.deepEqual(group.items, [
        { kind: "date", display: "custom", customFormat: "dddd" },
        { kind: "weather", display: "feels", weatherIcon: false },
        { kind: "weather", display: "sun" },
    ]);
});

test("only touching blocks of the same rows can be grouped", () =>
{
    const grid = new LayoutGrid(rowLayout());
    assert.equal(grid.groupable([1, 2]), null, "different rows");
    assert.equal(grid.groupable([2, 4]), null, "hole between them");
    assert.equal(grid.groupable([2]), null, "a single block");
    assert.notEqual(grid.groupable([3, 4]), null);
});

test("a group grouped again with a neighbour is flattened", () =>
{
    const once = new LayoutGrid(rowLayout()).grouped([2, 3])!;
    const twice = new LayoutGrid(once).grouped([5, 4])!;
    const group = twice.blocks.find((block) => block.kind === "group")!;
    assert.deepEqual(group.items!.map((item) => item.display), ["custom", "feels", "sun"]);
    assert.equal(group.w, 6);
});

test("ungrouping splits the group back into even blocks with the group's look", () =>
{
    const grouped = new LayoutGrid(rowLayout()).grouped([2, 3, 4])!;
    grouped.blocks[1] = { ...grouped.blocks[1], w: 5, letterSpacing: 0.1 };
    const split = new LayoutGrid(grouped).ungrouped(5)!;
    const members = split.blocks.slice(1);
    assert.deepEqual(members.map((block) => [block.kind, block.x, block.w]), [["date", 0, 2], ["weather", 2, 2], ["weather", 4, 1]]);
    assert.deepEqual(members.map((block) => [block.textSize, block.letterSpacing]), [[80, 0.1], [80, 0.1], [80, 0.1]]);
    assert.equal(members[0].customFormat, "dddd");
    assert.equal(members[1].weatherIcon, false);
    for (const block of split.blocks)
    {
        assert.equal(block.items, undefined);
        assert.ok(new LayoutGrid(split).fits(block, block.id));
    }
});

test("a group narrower than its items is not ungrouped", () =>
{
    const grouped = new LayoutGrid(rowLayout()).grouped([2, 3, 4])!;
    grouped.blocks[1] = { ...grouped.blocks[1], w: 2 };
    assert.equal(new LayoutGrid(grouped).ungrouped(5), null);
});

test("a block dropped onto another makes it a group on the target's cells; onto a group it joins", () =>
{
    const merged = new LayoutGrid(rowLayout()).mergedInto(2, 4, false)!;
    assert.deepEqual(merged.blocks.map((block) => block.id), [1, 2, 3]);
    const group = merged.blocks[1];
    assert.deepEqual([group.kind, group.x, group.w, group.textSize, group.color, group.customFormat], ["group", 0, 2, 80, "#ff0000ff", undefined]);
    assert.deepEqual(group.items!.map((item) => item.display), ["custom", "sun"]);

    const joined = new LayoutGrid(merged).mergedInto(2, 3, true)!;
    assert.deepEqual(joined.blocks.map((block) => block.id), [1, 2]);
    assert.deepEqual(joined.blocks[1].items!.map((item) => item.display), ["feels", "custom", "sun"]);
    assert.equal(new LayoutGrid(joined).mergedInto(2, 2, false), null);
});

test("group members move left and right, and come out as blocks of their own", () =>
{
    const grouped = new LayoutGrid({ ...rowLayout(), rows: 3 }).grouped([2, 3, 4])!;
    const moved = new LayoutGrid(grouped).withMemberMoved(5, 0, 1)!;
    assert.deepEqual(moved.blocks[1].items!.map((item) => item.display), ["feels", "custom", "sun"]);
    assert.equal(new LayoutGrid(grouped).withMemberMoved(5, 0, -1), null);

    const once = new LayoutGrid(grouped).withMemberDetached(5, 1, [{ w: 2, h: 1 }])!;
    assert.equal(once.blockId, 6);
    const detached = once.layout.blocks.find((block) => block.id === 6)!;
    assert.deepEqual([detached.kind, detached.display, detached.weatherIcon, detached.x, detached.y, detached.w, detached.textSize], ["weather", "feels", false, 0, 2, 2, 80]);
    assert.deepEqual(once.layout.blocks.find((block) => block.id === 5)!.items!.map((item) => item.display), ["custom", "sun"]);

    const twice = new LayoutGrid(once.layout).withMemberDetached(5, 1, [{ w: 2, h: 1 }])!;
    const left = twice.layout.blocks.find((block) => block.id === 5)!;
    assert.deepEqual([left.kind, left.display, left.customFormat, left.items, left.w, left.textSize], ["date", "custom", "dddd", undefined, 6, 80]);
    const full = new LayoutGrid(rowLayout()).grouped([2, 3, 4])!;
    assert.equal(new LayoutGrid(full).withMemberDetached(5, 0, [{ w: 1, h: 1 }]), null, "no free cell");
});

test("a group shows its members' segments in a row, spaced", () =>
{
    const group = new LayoutGrid(rowLayout()).grouped([2, 3])!.blocks[1];
    assert.deepEqual(blockDefinition("group").segments({ ...group, itemGap: 0.5 }, DEFAULT_SEGMENT_CONTEXT), [
        { type: "TIME", value: "dddd", member: 0 },
        { type: "SPACE", value: "0.5" },
        { type: "WEATHER", value: "feelsLike", member: 1 },
    ]);
});

test("time blocks follow the global clock format, custom formats stay as typed", () =>
{
    const block = { id: 1, kind: "clock" as const, x: 0, y: 0, w: 1, h: 1, display: "HH:mm:ss", customFormat: "HH[h]" };
    assert.equal(timeFormat(block, DEFAULT_SEGMENT_CONTEXT, true), "HH:mm:ss");
    assert.equal(timeFormat(block, { hourCycle: "12", hourLeadingZero: false }, true), "h:mm:ss A");
    assert.equal(timeFormat({ ...block, display: "hh:mm" }, { hourCycle: "12", hourLeadingZero: true }, false), "hh:mm");
    assert.equal(timeFormat({ ...block, display: "custom" }, { hourCycle: "12", hourLeadingZero: false }, true), "HH[h]");
});

const timeLayout = (displays: string[]) => ({
    columns: 6,
    rows: 1,
    blocks: [
        { id: 1, kind: "flip", x: 0, y: 0, w: 2, h: 1, display: displays[0] },
        { id: 2, kind: "group", x: 2, y: 0, w: 4, h: 1, display: "group", items: [{ kind: "time", display: displays[1] }, { kind: "date", display: "dddd" }] },
    ],
});

test("old 12-hour blocks turn the global clock format to 12-hour once", () =>
{
    const store = storage({ layoutMigrated: true, clockLayout: timeLayout(["hh:mm", "h:mm A"]) });
    new LayoutMigration(store).run();
    const layout = layoutOf(store);
    assert.equal(layout.blocks[0].display, "HH:mm");
    assert.deepEqual(layout.blocks[1].items!.map((item) => item.display), ["HH:mm", "dddd"]);
    assert.equal(store.items.get("hourCycle"), JSON.stringify("12"));
    assert.equal(store.items.get("hourLeadingZero"), "true");

    store.items.set("hourCycle", JSON.stringify("24"));
    new LayoutMigration(store).run();
    assert.equal(store.items.get("hourCycle"), JSON.stringify("24"), "runs only once");
});

test("flip and time blocks become clock blocks that look the same, also in groups", () =>
{
    const before = timeLayout(["HH:mm", "HH:mm:ss"]);
    const store = storage({ layoutMigrated: true, clockLayout: before });
    new LayoutMigration(store).run();
    const [flip, group] = layoutOf(store).blocks;
    assert.deepEqual([flip.kind, flip.clockStyle, flip.textStyle], ["clock", undefined, "flip"]);
    assert.deepEqual(group.items!.map((item) => [item.kind, item.clockStyle, item.textStyle]), [["clock", undefined, undefined], ["date", undefined, undefined]]);
    assert.equal(group.textStyle, undefined);

    // Same segments as the old flip time and time definitions drew.
    const segmentsOf = (block: LayoutBlock) => blockDefinition(block.kind).segments(block, DEFAULT_SEGMENT_CONTEXT);
    assert.deepEqual(segmentsOf(flip), [{ type: "FLIPTIME", value: "HH:mm" }]);
    assert.deepEqual(segmentsOf(group).filter((segment) => segment.member === 0), [{ type: "TIME", value: "HH:mm:ss", member: 0 }]);

    store.items.set("clockLayout", JSON.stringify(before));
    new LayoutMigration(store).run();
    assert.equal(layoutOf(store).blocks[0].kind, "flip", "runs only once");
});

test("seconds bars become smooth minute progress bars that keep their look", () =>
{
    const bar = { id: 1, kind: "secondsBar", x: 0, y: 0, w: 4, h: 1, display: "bar", barColor: "#ff0000ff", barThickness: 6 };
    const store = storage({ layoutMigrated: true, clockLayout: { columns: 4, rows: 1, blocks: [bar] } });
    new LayoutMigration(store).run();
    const [block] = layoutOf(store).blocks;
    assert.deepEqual(
        [block.kind, block.clockStyle, block.progressShape, block.progressUnit, block.progressMotion, block.barColor, block.barThickness],
        ["clock", "progress", "bar", "minute", "smooth", "#ff0000ff", 6],
    );
    assert.deepEqual(blockDefinition(block.kind).segments(block, DEFAULT_SEGMENT_CONTEXT), [{ type: "PROGRESSBAR", value: "", unit: "minute", motion: "smooth" }]);
});

test("progress: smooth ends where the old seconds bar did, stepped counts the current step", () =>
{
    const at = (hours: number, minutes: number, seconds: number) => new Date(2026, 10, 15, hours, minutes, seconds);
    // Old bar: (seconds + 1) / 60, full after second 59.
    assert.equal(progressShare(at(9, 0, 0), "minute", "smooth"), 1 / 60);
    assert.equal(progressShare(at(9, 0, 59), "minute", "smooth"), 1);
    assert.equal(progressShare(at(9, 0, 59), "minute", "stepped"), 1);
    assert.equal(progressShare(at(9, 30, 0), "hour", "smooth"), 1801 / 3600);
    assert.equal(progressShare(at(9, 30, 59), "hour", "stepped"), 31 / 60);
    assert.equal(progressShare(at(12, 0, 0), "day", "stepped"), 721 / 1440);
    assert.equal(progressShare(at(23, 59, 59), "day", "smooth"), 1);
});

test("old rows become clock blocks with the flip or text style", () =>
{
    const store = storage({ format: "$FLIPTIME(HH:mm) $TIME(HH:mm:ss) $TIME(dddd)", secondRowEnabled: false });
    new LayoutMigration(store).run();
    const kinds = layoutOf(store).blocks.map((block) => [block.kind, block.clockStyle, block.textStyle]);
    assert.deepEqual(kinds, [["clock", undefined, "flip"], ["clock", undefined, "text"], ["date", undefined, undefined]]);
});

test("mixed 12- and 24-hour blocks keep the 24-hour default", () =>
{
    const store = storage({ layoutMigrated: true, clockLayout: timeLayout(["HH:mm:ss", "h:mm A"]) });
    new LayoutMigration(store).run();
    assert.equal(store.items.has("hourCycle"), false);
    assert.equal(layoutOf(store).blocks[1].items![0].display, "HH:mm");
});

test("one block padding becomes horizontal and vertical padding drawn as before", () =>
{
    const block = (id: number, padding?: number) => ({ id, kind: "text", display: "text", x: id, y: 0, w: 1, h: 1, ...(padding !== undefined && { padding }) });
    const layout = { columns: 4, rows: 1, blocks: [block(0, 0), block(1, 6), block(2, 16), block(3)] };
    const store = storage({ layoutMigrated: true, clockLayout: layout });
    new LayoutMigration(store).run();
    const blocks = layoutOf(store).blocks as (LayoutBlock & { padding?: number })[];
    // Old: horizontal the padding, vertical half of it but at least 4 px.
    assert.deepEqual(blocks.map((migrated) => [migrated.paddingX, migrated.paddingY, migrated.padding]), [
        [0, 4, undefined],
        [6, 4, undefined],
        [16, 8, undefined],
        // Unset stays unset: the new defaults (8 / 4) are the old default 8.
        [undefined, undefined, undefined],
    ]);

    // Once only: a later run keeps what the user set since.
    store.setItem("clockLayout", JSON.stringify({ ...layout, blocks: [{ ...block(0), paddingX: 3, paddingY: 0 }] }));
    new LayoutMigration(store).run();
    assert.deepEqual([layoutOf(store).blocks[0].paddingX, layoutOf(store).blocks[0].paddingY], [3, 0]);
});

test("saved layouts get their padding split too", () =>
{
    const layout = { columns: 2, rows: 1, blocks: [{ id: 1, kind: "text", display: "text", x: 0, y: 0, w: 1, h: 1, padding: 12 }] };
    const store = storage({ layoutMigrated: true, savedLayouts: [{ id: 1, name: "Old", layout }] });
    new LayoutMigration(store).run();
    const saved = JSON.parse(store.getItem("savedLayouts")!) as { name: string; layout: { blocks: (LayoutBlock & { padding?: number })[] } }[];
    const migrated = saved[0].layout.blocks[0];
    assert.equal(saved[0].name, "Old");
    assert.deepEqual([migrated.paddingX, migrated.paddingY, migrated.padding], [12, 6, undefined]);
});

// A layout of the clock-styles version: digit styles were clock styles, unset meant flip.
const clockStyleLayout = (): ClockLayout => ({
    columns: 8,
    rows: 2,
    blocks: [
        { id: 1, kind: "clock", x: 0, y: 0, w: 2, h: 1, display: "HH:mm", cardColor: "#ff0000ff" },
        { id: 2, kind: "clock", clockStyle: "segment" as never, x: 2, y: 0, w: 2, h: 1, display: "HH:mm", glowColor: "#00ff00ff" },
        { id: 3, kind: "clock", clockStyle: "analogFine", x: 4, y: 0, w: 2, h: 1, display: "HH:mm" },
        { id: 4, kind: "date", x: 6, y: 0, w: 2, h: 1, display: "dddd" },
        {
            id: 5, kind: "group", x: 0, y: 1, w: 4, h: 1, display: "group",
            items: [{ kind: "clock", display: "HH:mm", clockStyle: "dots" as never }, { kind: "clock", display: "HH:mm", clockStyle: "rings" }],
        },
        {
            id: 6, kind: "group", x: 4, y: 1, w: 4, h: 1, display: "group",
            items: [{ kind: "clock", display: "HH:mm" }, { kind: "weather", display: "temp" }],
        },
    ],
});

test("clock digit styles become text styles and every block draws as before", () =>
{
    const before = clockStyleLayout();
    const store = storage({ layoutMigrated: true, clockKindMigrated: true, clockLayout: before });
    new LayoutMigration(store).run();
    const [flip, lcd, analog, date, dotsGroup, mixedGroup] = layoutOf(store).blocks;
    const segmentsOf = (block: LayoutBlock) => blockDefinition(block.kind).segments(block, DEFAULT_SEGMENT_CONTEXT);

    assert.deepEqual([flip.clockStyle, flip.textStyle, flip.cardColor], [undefined, "flip", "#ff0000ff"]);
    assert.deepEqual(segmentsOf(flip), [{ type: "FLIPTIME", value: "HH:mm" }]);
    assert.deepEqual([lcd.clockStyle, lcd.textStyle, lcd.glowColor], [undefined, "segment", "#00ff00ff"]);
    assert.deepEqual(segmentsOf(lcd), [{ type: "FACE", value: "HH:mm", face: "segment" }]);
    assert.deepEqual([analog.clockStyle, analog.textStyle], ["analogFine", undefined]);
    assert.deepEqual(segmentsOf(date), [{ type: "TIME", value: "dddd" }], "other blocks stay plain text");

    // One drawn style in the group: it becomes the group's, the face member keeps its face.
    assert.equal(dotsGroup.textStyle, "dots");
    assert.deepEqual(dotsGroup.items!.map((item) => [item.clockStyle, item.textStyle]), [[undefined, undefined], ["rings", undefined]]);
    assert.deepEqual(segmentsOf(dotsGroup).map((segment) => segment.face), ["dots", undefined, "rings"]);

    // Flip clock beside plain weather: the group stays plain text, the clock keeps its flip.
    assert.equal(mixedGroup.textStyle, undefined);
    assert.deepEqual(mixedGroup.items!.map((item) => item.textStyle), ["flip", undefined]);
    assert.deepEqual(segmentsOf(mixedGroup).map((segment) => [segment.type, segment.textStyle]), [
        ["FLIPTIME", undefined],
        ["SPACE", undefined],
        ["WEATHER", undefined],
    ]);

    store.items.set("clockLayout", JSON.stringify(before));
    new LayoutMigration(store).run();
    assert.equal(layoutOf(store).blocks[1].clockStyle, "segment", "runs only once");
});

test("saved layouts get text styles too, also from the old block kinds", () =>
{
    const flipKind = { id: 1, kind: "flip", x: 0, y: 0, w: 2, h: 1, display: "HH:mm" };
    const store = storage({
        layoutMigrated: true,
        clockKindMigrated: true,
        savedLayouts: [{ id: 1, name: "Old", layout: clockStyleLayout() }, { id: 2, name: "Older", layout: { columns: 2, rows: 1, blocks: [flipKind] } }],
    });
    new LayoutMigration(store).run();
    const saved = JSON.parse(store.getItem("savedLayouts")!) as { layout: ClockLayout }[];
    assert.deepEqual([saved[0].layout.blocks[1].clockStyle, saved[0].layout.blocks[1].textStyle], [undefined, "segment"]);
    assert.deepEqual([saved[1].layout.blocks[0].kind, saved[1].layout.blocks[0].textStyle], ["clock", "flip"]);
});

test("text, weather, date and calendar blocks carry their text style in their segments", () =>
{
    const base = { id: 1, x: 0, y: 0, w: 2, h: 1 };
    const segmentsOf = (block: LayoutBlock) => blockDefinition(block.kind).segments(block, DEFAULT_SEGMENT_CONTEXT);
    assert.deepEqual(segmentsOf({ ...base, kind: "text", display: "text", text: "Hi", textStyle: "dots" }), [{ type: "TEXT", value: "Hi", textStyle: "dots" }]);
    assert.deepEqual(segmentsOf({ ...base, kind: "weather", display: "temp", textStyle: "flip", flipUnit: "word" }), [{ type: "WEATHER", value: "tempEmoji", textStyle: "flip", flipUnit: "word" }]);
    assert.deepEqual(segmentsOf({ ...base, kind: "date", display: "dddd", textStyle: "nixie" }), [{ type: "FACE", value: "dddd", face: "nixie" }]);
    assert.deepEqual(segmentsOf({ ...base, kind: "date", display: "dddd", textStyle: "flip", flipUnit: "word" }), [{ type: "FLIPTIME", value: "dddd", flipUnit: "word" }]);
    assert.equal(segmentsOf({ ...base, kind: "calendar", display: "next", textStyle: "segment" })[0].textStyle, "segment");
});
