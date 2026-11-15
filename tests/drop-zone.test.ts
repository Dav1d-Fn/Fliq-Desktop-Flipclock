// Runs with `npm test`: what dropping a block onto another does, and where blocks slide to.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LayoutGrid, type ClockLayout, type LayoutBlock } from "../src/layout/ClockLayout.ts";

function block(id: number, x: number, w: number, extra: Partial<LayoutBlock> = {}): LayoutBlock
{
    return { id, kind: "time", x, y: 0, w, h: 1, display: "HH:mm", ...extra };
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
    const bar = block(1, 0, 2, { kind: "secondsBar" });
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
