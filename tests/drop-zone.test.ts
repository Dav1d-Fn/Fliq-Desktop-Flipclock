// Runs with `npm test`: what dropping a block onto another does, and where blocks slide to.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LayoutGrid, type ClockLayout, type LayoutBlock } from "../src/layout/ClockLayout.ts";

function block(id: number, x: number, w: number, extra: Partial<LayoutBlock> = {}): LayoutBlock
{
    return { id, kind: "clock", x, y: 0, w, h: 1, display: "HH:mm", ...extra };
}

function positions(layout: ClockLayout | null): Record<number, [number, number]>
{
    assert.ok(layout);
    return Object.fromEntries(layout.blocks.map((item) => [item.id, [item.x, item.y]]));
}

test("middle of the target groups, the edges slide in before or after", () =>
{
    const target = block(1, 0, 2);
    const dropped = block(2, 2, 1);
    assert.equal(LayoutGrid.dropZone(target, dropped, 0.5), "group");
    assert.equal(LayoutGrid.dropZone(target, dropped, 0.31), "group");
    assert.equal(LayoutGrid.dropZone(target, dropped, 0.2), "before");
    assert.equal(LayoutGrid.dropZone(target, dropped, 0.9), "after");
});

test("zones that cannot happen give way", () =>
{
    const bar = block(1, 0, 2, { clockStyle: "progress" });
    const tall = block(3, 0, 1, { h: 2 });
    assert.equal(LayoutGrid.dropZone(bar, block(2, 2, 1), 0.5), "after");
    assert.equal(LayoutGrid.dropZone(block(1, 0, 2), tall, 0.1), "group");
    assert.equal(LayoutGrid.dropZone(bar, tall, 0.5), null);
});

test("dropping on a neighbour's far edge swaps the two", () =>
{
    const layout: ClockLayout = { columns: 4, rows: 1, blocks: [block(1, 0, 2), block(2, 2, 2)] };
    assert.deepEqual(positions(new LayoutGrid(layout).withBlockInserted(2, 1, false)), { 1: [2, 0], 2: [0, 0] });
});

test("the line closes the dragged block's old spot", () =>
{
    const layout: ClockLayout = { columns: 4, rows: 1, blocks: [block(1, 0, 1), block(2, 1, 1), block(3, 2, 1)] };
    assert.deepEqual(positions(new LayoutGrid(layout).withBlockInserted(3, 1, true)), { 1: [1, 0], 2: [0, 0], 3: [2, 0] });
});

test("a block from another row pushes the line into free cells, around other blocks", () =>
{
    const layout: ClockLayout = {
        columns: 5,
        rows: 2,
        blocks: [block(1, 0, 1), block(2, 1, 1), block(4, 2, 1, { h: 2 }), block(3, 0, 1, { y: 1 })],
    };
    assert.deepEqual(positions(new LayoutGrid(layout).withBlockInserted(1, 3, true)), { 1: [1, 0], 2: [3, 0], 4: [2, 0], 3: [0, 0] });
});

test("no room gives null, the spot the block already has changes nothing", () =>
{
    const full: ClockLayout = { columns: 2, rows: 2, blocks: [block(1, 0, 1), block(2, 1, 1), block(3, 0, 1, { y: 1 })] };
    assert.equal(new LayoutGrid(full).withBlockInserted(1, 3, true), null);
    assert.deepEqual(new LayoutGrid(full).withBlockInserted(2, 1, true), full);
});

test("top and bottom edges add a row when allowed, the middle still groups", () =>
{
    const target = block(1, 0, 4);
    const dropped = block(2, 0, 1, { y: 1 });
    assert.equal(LayoutGrid.dropZone(target, dropped, 0.5, 0.1, true), "above");
    assert.equal(LayoutGrid.dropZone(target, dropped, 0.5, 0.9, true), "below");
    assert.equal(LayoutGrid.dropZone(target, dropped, 0.1, 0.5, true), "before");
    assert.equal(LayoutGrid.dropZone(target, dropped, 0.5, 0.5, true), "group");
    assert.equal(LayoutGrid.dropZone(target, dropped, 0.5, 0.1, false), "group");
});

test("a full line makes room by shrinking its widest block", () =>
{
    const layout: ClockLayout = { columns: 4, rows: 2, blocks: [block(1, 0, 3), block(2, 3, 1), block(3, 0, 2, { y: 1 })] };
    const inserted = new LayoutGrid(layout).withBlockInserted(2, 3, false);
    assert.ok(inserted);
    assert.deepEqual(inserted.blocks.map((item) => [item.id, item.x, item.y, item.w]), [[1, 0, 0, 1], [2, 1, 0, 1], [3, 2, 0, 2]]);
});

test("dropping below adds a row, shifts the rows and drops the emptied row", () =>
{
    const layout: ClockLayout = {
        columns: 4,
        rows: 3,
        blocks: [block(1, 0, 4), block(2, 0, 2, { y: 1 }), block(3, 1, 2, { y: 2 })],
    };
    // Block 3 leaves row 2 for a new row under row 0: rows stay at 3.
    const result = new LayoutGrid(layout).withBlockInNewRow(1, 3, true);
    assert.ok(result);
    assert.equal(result.rows, 3);
    assert.deepEqual(positions(result), { 1: [0, 0], 2: [0, 2], 3: [1, 1] });
});

test("a new row grows blocks reaching across it and finds free columns", () =>
{
    const layout: ClockLayout = { columns: 2, rows: 2, blocks: [block(1, 0, 1, { h: 2 }), block(2, 1, 1), block(3, 1, 1, { y: 1 })] };
    const result = new LayoutGrid(layout).withBlockInNewRow(2, 3, true);
    assert.ok(result);
    // Block 1 still covers block 3's old row, so that row stays.
    assert.equal(result.rows, 3);
    assert.deepEqual(result.blocks.map((item) => [item.id, item.x, item.y, item.h]), [[1, 0, 0, 3], [2, 1, 0, 1], [3, 1, 1, 1]]);
});

test("no new row past the row limit", () =>
{
    const blocks = [block(1, 0, 2), block(2, 0, 2, { y: 1 }), block(3, 0, 2, { y: 2 }), block(4, 0, 1, { y: 3 }), block(5, 1, 1, { y: 3 })];
    const layout: ClockLayout = { columns: 2, rows: 4, blocks };
    assert.equal(new LayoutGrid(layout).withBlockInNewRow(1, 4, true), null);
    // Unless the dragged block leaves its row empty.
    const alone: ClockLayout = { columns: 2, rows: 4, blocks: blocks.slice(0, 4) };
    assert.equal(new LayoutGrid(alone).withBlockInNewRow(1, 4, true)?.rows, 4);
});

test("sliding the only block of a row into another removes the emptied row", () =>
{
    const layout: ClockLayout = { columns: 4, rows: 2, blocks: [block(1, 0, 2), block(2, 0, 1, { y: 1 })] };
    const result = new LayoutGrid(layout).withBlockInserted(1, 2, false);
    assert.ok(result);
    assert.equal(result.rows, 1);
});
