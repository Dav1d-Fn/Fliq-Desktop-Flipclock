// Runs with `npm test` (node --test, no extra dependency).
import { test } from "node:test";
import assert from "node:assert/strict";
import { LayoutMigration } from "../src/layout/LayoutMigration.ts";
import { LayoutGrid, type ClockLayout } from "../src/layout/ClockLayout.ts";
import { blockDefinition } from "../src/blocks/BlockRegistry.ts";
import { DEFAULT_SEGMENT_CONTEXT, timeFormat } from "../src/blocks/BlockDefinition.ts";

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
    assert.deepEqual([flip.kind, flip.display, flip.x, flip.y, flip.w], ["flip", "HH:mm", 0, 0, 6]);
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
            { id: 1, kind: "flip", x: 0, y: 0, w: 4, h: 1, display: "HH:mm" },
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

test("grid: column widths and row heights follow their defaults until set apart", () =>
{
    // Gaps 2 px. Columns 64, 100, 64; rows 40, 40.
    const layout: ClockLayout = { columns: 3, rows: 2, rowHeight: 40, columnWidths: [null, 100], blocks: [] };
    const grid = new LayoutGrid(layout);
    assert.equal(grid.columnStart(2), 64 + 2 + 100 + 2);
    assert.deepEqual(grid.pixelRect({ x: 1, y: 0, w: 2, h: 2 }, 1), { left: 66, top: 0, width: 166, height: 82 });
    assert.deepEqual(grid.size(1), { width: 232, height: 82 });
    // Resize snaps to the far edge of the wide column.
    assert.equal(grid.resizeTarget({ id: 1, kind: "text", x: 0, y: 0, w: 1, h: 1, display: "text" }, "right", 100, 0).w, 2);

    const set = grid.withTrackSize({ axis: "row", index: 1 }, 80);
    assert.deepEqual(set.rowHeights, [null, 80]);
    assert.deepEqual(set.columnWidths, [null, 100]);
    const reset = new LayoutGrid(set).withTrackSize({ axis: "column", index: 1 }, null);
    assert.equal(new LayoutGrid(reset).columnEnd(2), 64 * 3 + 4);
    // A removed column drops its own width.
    assert.deepEqual(grid.resized(1, 2)?.columnWidths, [null]);
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
        { id: 1, kind: "flip", x: 0, y: 0, w: 6, h: 1, display: "HH:mm" },
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
    const block = { id: 1, kind: "time" as const, x: 0, y: 0, w: 1, h: 1, display: "HH:mm:ss", customFormat: "HH[h]" };
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

test("mixed 12- and 24-hour blocks keep the 24-hour default", () =>
{
    const store = storage({ layoutMigrated: true, clockLayout: timeLayout(["HH:mm:ss", "h:mm A"]) });
    new LayoutMigration(store).run();
    assert.equal(store.items.has("hourCycle"), false);
    assert.equal(layoutOf(store).blocks[1].items![0].display, "HH:mm");
});
