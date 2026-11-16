// Runs with `npm test` (node --test, no extra dependency).
import { test } from "node:test";
import assert from "node:assert/strict";
import { HiddenSpaceMigration } from "../src/layout/HiddenSpaceMigration.ts";
import { LayoutMigration } from "../src/layout/LayoutMigration.ts";
import type { ClockLayout, LayoutBlock } from "../src/layout/ClockLayout.ts";

const migrate = HiddenSpaceMigration.withoutHiddenSpace;

const near = (actual: number | undefined, expected: number, tolerance: number) =>
    assert.ok(actual !== undefined && Math.abs(actual - expected) <= tolerance, `${actual} is not ${expected} ± ${tolerance}`);

// The default layout before the cleanup: flip time on top, a group of date, sun and temperature.
const oldDefault = (): ClockLayout => ({
    columns: 4,
    rows: 2,
    columnGap: 0,
    rowGap: 0,
    blocks: [
        { id: 1, kind: "clock", textStyle: "flip", x: 0, y: 0, w: 4, h: 1, display: "HH:mm", paddingX: 0, paddingY: 4, letterSpacing: -0.03, textSize: 99 },
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
            paddingX: 0,
            paddingY: 8,
            letterSpacing: -0.14,
            textSize: 100,
        },
    ],
});

test("a row of plain text keeps its old height as its minimum, without hidden padding", () =>
{
    const layout = migrate(oldDefault());
    const [flip, group] = layout.blocks;
    // Measured in the old editor: the group's row was 42.4 px high.
    assert.equal(layout.rowHeightOverrides?.[0], null);
    near(layout.rowHeightOverrides?.[1], 42.4, 2);
    assert.equal(group.paddingY, undefined);
    assert.equal(group.paddingX, undefined);
    // Its text was drawn at the size the negative letter spacing allows: that is its text size now.
    near(group.textSize, 81, 2);
    // Flip cards always filled their room: only the stored padding stays.
    assert.deepEqual([flip.paddingX, flip.paddingY, flip.textSize], [undefined, 4, 99]);
});

test("unset padding of a block without background becomes text size and row height", () =>
{
    const text: LayoutBlock = { id: 1, kind: "date", display: "DD.MM.YYYY", x: 0, y: 0, w: 2, h: 1 };
    const layout = migrate({ columns: 2, rows: 1, columnGap: 0, rowGap: 0, blocks: [text] });
    const [block] = layout.blocks;
    // 128 px wide, 8 px left and right: "16.11.2026" (10 characters, 6 em) at 112 / 6 px.
    const fontSize = 112 / 6;
    near(layout.rowHeightOverrides?.[0], fontSize * 1.2 / 0.62 + 8, 1);
    // The same font size in the whole width.
    near(block.textSize, 100 * 112 / 128, 0.6);
    assert.deepEqual([block.paddingX, block.paddingY], [undefined, undefined]);
});

test("a block with its own background keeps its padding", () =>
{
    const text: LayoutBlock = { id: 1, kind: "text", display: "text", text: "Hello", x: 0, y: 0, w: 2, h: 1, background: true, paddingX: 10, paddingY: 6 };
    const layout = migrate({ columns: 2, rows: 1, columnGap: 0, rowGap: 0, blocks: [text] });
    const [block] = layout.blocks;
    assert.deepEqual([block.paddingX, block.paddingY, block.textSize], [10, 6, undefined]);
    // 108 px for 3 em: 36 px font size.
    near(layout.rowHeightOverrides?.[0], 36 * 1.2 / 0.62 + 12, 1);
});

test("text squeezed by a row set by hand keeps its size, the row its height", () =>
{
    const text: LayoutBlock = { id: 1, kind: "text", display: "text", text: "Hi", x: 0, y: 0, w: 4, h: 1, paddingX: 0, paddingY: 0 };
    const layout = migrate({ columns: 4, rows: 1, columnGap: 0, rowGap: 0, rowHeightOverrides: [40], blocks: [text] });
    const [block] = layout.blocks;
    assert.deepEqual(layout.rowHeightOverrides, [40]);
    // The row allowed 40 · 0.62 / 1.2 px; "Hi" (1.2 em) in 256 px would be far larger.
    const fontSize = 40 * 0.62 / 1.2;
    near(block.textSize, 100 * fontSize * 1.2 / 256, 0.6);
});

test("next to flip cards, text keeps its stored padding and the row stays automatic", () =>
{
    const layout = migrate({
        columns: 4,
        rows: 1,
        columnGap: 0,
        rowGap: 0,
        blocks: [
            { id: 1, kind: "clock", textStyle: "flip", display: "HH:mm", x: 0, y: 0, w: 2, h: 1 },
            { id: 2, kind: "text", display: "text", text: "Hi", x: 2, y: 0, w: 2, h: 1 },
        ],
    });
    assert.equal(layout.rowHeightOverrides, undefined);
    assert.deepEqual(layout.blocks.map((block) => [block.paddingX, block.paddingY]), [[undefined, 4], [undefined, 4]]);
});

test("a left aligned block keeps its content where its padding put it", () =>
{
    const text: LayoutBlock = { id: 1, kind: "text", display: "text", text: "Hi", x: 0, y: 0, w: 2, h: 1, align: "left", paddingX: 6, offsetX: 2 };
    const right: LayoutBlock = { ...text, id: 2, x: 2, align: "right" };
    const layout = migrate({ columns: 4, rows: 1, columnGap: 0, rowGap: 0, blocks: [text, right] });
    assert.deepEqual(layout.blocks.map((block) => block.offsetX), [8, -4]);
});

test("runs once, on the layout and the saved layouts", () =>
{
    const items = new Map<string, string>([
        ["layoutMigrated", "true"],
        ["clockLayout", JSON.stringify(oldDefault())],
        ["savedLayouts", JSON.stringify([{ id: 1, name: "Old", layout: oldDefault() }])],
    ]);
    const store = { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value) };
    new LayoutMigration(store).run();
    const layout = JSON.parse(items.get("clockLayout")!) as ClockLayout;
    const saved = JSON.parse(items.get("savedLayouts")!) as { name: string; layout: ClockLayout }[];
    assert.ok(layout.rowHeightOverrides?.[1]);
    assert.deepEqual(saved[0].layout, layout);
    assert.equal(saved[0].name, "Old");

    // A second run leaves what the user changed since.
    items.set("clockLayout", JSON.stringify(oldDefault()));
    new LayoutMigration(store).run();
    assert.equal((JSON.parse(items.get("clockLayout")!) as ClockLayout).rowHeightOverrides, undefined);
});
