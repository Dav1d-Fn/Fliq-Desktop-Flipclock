// Runs with `npm test` (node --test, no extra dependency).
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LAYOUT, type ClockLayout } from "../src/layout/ClockLayout.ts";
import { LayoutValidator } from "../src/layout/LayoutValidator.ts";

const validator = new LayoutValidator();

// A small valid layout the tests bend out of shape one field at a time.
// Loose on purpose: the tests write values no ClockLayout allows.
interface LooseLayout
{
    blocks: Record<string, unknown>[];
    [field: string]: unknown;
}

function layoutWith(change: (layout: LooseLayout) => void): unknown
{
    const layout: LooseLayout = {
        columns: 4,
        rows: 2,
        blocks: [
            { id: 1, kind: "flip", x: 0, y: 0, w: 4, h: 1, display: "HH:mm" },
            { id: 2, kind: "text", x: 0, y: 1, w: 2, h: 1, display: "text", text: "Hello", color: "#FF0000" },
        ],
    };
    change(layout);
    return layout;
}

function refused(value: unknown): boolean
{
    return validator.validated(value) === null;
}

test("the default layout passes unchanged", () =>
{
    assert.deepEqual(validator.validated(structuredClone(DEFAULT_LAYOUT)), DEFAULT_LAYOUT);
});

test("a layout as the 1.x migration writes it passes", () =>
{
    const migrated: ClockLayout = {
        columns: 6,
        rows: 2,
        blocks: [
            { id: 1, kind: "flip", x: 0, y: 0, w: 6, h: 1, display: "custom", customFormat: "hh:mm:ss", cardColor: "#1f1f1fff", cardRadius: 16 },
            { id: 2, kind: "time", x: 0, y: 1, w: 2, h: 1, display: "hh:mm A", font: "\"Segoe UI\", sans-serif", color: "#fafafaff", align: "left" },
            { id: 3, kind: "weather", x: 2, y: 1, w: 4, h: 1, display: "cond", weatherIcon: false, textSize: 180 },
        ],
    };
    assert.deepEqual(validator.validated(structuredClone(migrated)), migrated);
});

test("values that are not a layout are refused", () =>
{
    for (const value of [null, undefined, 7, "layout", [], { columns: 4, rows: 2 }, { columns: 4, rows: 2, blocks: {} }])
    {
        assert.ok(refused(value), JSON.stringify(value));
    }
});

test("the grid size has to stay inside the limits", () =>
{
    assert.ok(refused(layoutWith((layout) => (layout.columns = 9))));
    assert.ok(refused(layoutWith((layout) => (layout.columns = 1))));
    assert.ok(refused(layoutWith((layout) => (layout.rows = 5))));
    assert.ok(refused(layoutWith((layout) => (layout.rows = 0))));
    assert.ok(refused(layoutWith((layout) => (layout.columns = 4.5))));
    assert.ok(refused(layoutWith((layout) => (layout.rows = "2"))));
});

test("blocks have to lie inside the grid without overlapping", () =>
{
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].x = 3))), "reaches past the right edge");
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].y = 0))), "overlaps the flip block");
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].w = 0))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].x = -1))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].h = 1.5))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].x = Number.NaN))));
});

test("block ids are unique positive whole numbers", () =>
{
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].id = 1))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].id = 0))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].id = "2"))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].id = 2.5))));
});

test("more than 32 blocks are refused", () =>
{
    const crowded = {
        columns: 8,
        rows: 4,
        blocks: Array.from({ length: 33 }, (_, index) => ({ id: index + 1, kind: "text", x: index % 8, y: 0, w: 1, h: 1, display: "text" })),
    };
    assert.ok(refused(crowded));
});

test("unknown kinds, long texts and wrong types are refused", () =>
{
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].kind = "calendar"))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].text = "x".repeat(201)))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].customFormat = "H".repeat(201)))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].display = 5))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].text = 5))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].weatherIcon = "yes"))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].background = 1))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].align = "justify"))));
    assert.ok(!refused(layoutWith((layout) => (layout.blocks[1].text = "x".repeat(200)))));
});

test("colors are hex colors, stored in lower case", () =>
{
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].color = "red"))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].cardColor = "#12345"))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].backgroundColor = "url(x)"))));
    const layout = validator.validated(layoutWith(() => undefined));
    assert.equal(layout?.blocks[1].color, "#ff0000");
});

test("fonts are plain font-family lists", () =>
{
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].font = "Arial; background: url(x)"))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].font = "A".repeat(121)))));
    assert.ok(!refused(layoutWith((layout) => (layout.blocks[1].font = "\"JetBrains Mono Variable\", monospace"))));
});

test("numbers have to be finite and inside their bounds", () =>
{
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].textSize = Number.POSITIVE_INFINITY))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].textSize = 0))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].letterSpacing = 99))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].offsetX = 1e9))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].padding = -1))));
    assert.ok(refused(layoutWith((layout) => (layout.columnGap = -1))));
    assert.ok(refused(layoutWith((layout) => (layout.rowHeight = "56"))));
});

test("groups hold one to eight members and no group", () =>
{
    const group = (items: unknown) => layoutWith((layout) =>
    {
        layout.blocks[1] = { id: 2, kind: "group", x: 0, y: 1, w: 4, h: 1, display: "group", items };
    });
    assert.ok(!refused(group([{ kind: "date", display: "dddd" }, { kind: "text", display: "text", text: "Hi" }])));
    assert.ok(refused(group([])));
    assert.ok(refused(group("date")));
    assert.ok(refused(group([{ kind: "group", display: "group" }])));
    assert.ok(refused(group(Array.from({ length: 9 }, () => ({ kind: "date", display: "dddd" })))));
    assert.ok(refused(group([{ kind: "text", display: "text", text: "x".repeat(201) }])));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].kind = "group"))), "a group without members");
});

test("gap and size lists fit the grid and hold numbers or null", () =>
{
    assert.ok(!refused(layoutWith((layout) => (layout.rowHeights = [65, null]))));
    assert.ok(!refused(layoutWith((layout) => (layout.columnGaps = [null, 4, 0]))));
    assert.ok(refused(layoutWith((layout) => (layout.rowHeights = [65, 35, 20]))), "longer than the grid");
    assert.ok(refused(layoutWith((layout) => (layout.columnWidths = [64, "wide"]))));
    assert.ok(refused(layoutWith((layout) => (layout.columnGaps = "none"))));
    assert.ok(refused(layoutWith((layout) => (layout.rowGaps = [-3]))));
});

test("unknown fields are dropped, not stored", () =>
{
    const layout = validator.validated(layoutWith((draft) =>
    {
        draft.script = "alert(1)";
        draft.blocks[1].onclick = "alert(1)";
        draft.blocks[1].__proto__ = { polluted: true };
    }));
    assert.ok(layout);
    assert.equal("script" in layout, false);
    assert.equal("onclick" in layout.blocks[1], false);
    assert.equal((layout.blocks[1] as unknown as Record<string, unknown>).polluted, undefined);
});
