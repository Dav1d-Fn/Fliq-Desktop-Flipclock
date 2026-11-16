// Runs with `npm test` (node --test, no extra dependency).
import { test } from "node:test";
import assert from "node:assert/strict";
import { CONTENT_LIMITS, DEFAULT_LAYOUT, GRID_LIMITS, LayoutGrid, type ClockLayout, type ClockStyle, type GroupItem, type LayoutBlock, type ProgressMotion, type ProgressShape, type ProgressUnit, type TextStyle } from "../src/layout/ClockLayout.ts";
import { LayoutMigration } from "../src/layout/LayoutMigration.ts";
import { LayoutValidator } from "../src/layout/LayoutValidator.ts";
import { BLOCK_DEFINITIONS } from "../src/blocks/BlockRegistry.ts";
import { withClockStyle, withTextStyle } from "../src/blocks/StyleSettings.ts";
import type { CalendarBlockSettings } from "../src/calendar/CalendarTypes.ts";

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
            { id: 1, kind: "clock", textStyle: "flip", x: 0, y: 0, w: 4, h: 1, display: "HH:mm" },
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

test("a layout migrated from 1.x passes unchanged", () =>
{
    const items = new Map<string, string>([
        ["format", JSON.stringify("$FLIPTIME(HH:mm:ss)")],
        ["secondRowEnabled", JSON.stringify(true)],
        ["secondRowFormat", JSON.stringify("$TIME(dddd, DD.MM) $TEXT( ) $WEATHER(feelsLikeEmoji) $TEXT( ) $WEATHER(nextSun)")],
        ["flipCardBackground", JSON.stringify("#ff0000ff")],
    ]);
    new LayoutMigration({ getItem: (key) => items.get(key) ?? null, setItem: (key, value) => void items.set(key, value) }).run();
    const migrated = JSON.parse(items.get("clockLayout")!);
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
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].kind = "flip"))), "a kind of 2.0");
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
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].paddingX = -1))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].labelSize = "big"))));
    assert.ok(refused(layoutWith((layout) => (layout.columnGap = -1))));
    assert.ok(refused(layoutWith((layout) => (layout.columnWidth = "64"))));
});

test("groups hold up to the member limit and no group", () =>
{
    const group = (items: unknown) => layoutWith((layout) =>
    {
        layout.blocks[1] = { id: 2, kind: "group", x: 0, y: 1, w: 4, h: 1, display: "group", items };
    });
    assert.ok(!refused(group([{ kind: "date", display: "dddd" }, { kind: "text", display: "text", text: "Hi" }])));
    assert.ok(refused(group([])));
    assert.ok(refused(group("date")));
    assert.ok(refused(group([{ kind: "group", display: "group" }])));
    assert.ok(refused(group(Array.from({ length: CONTENT_LIMITS.groupMembers + 1 }, () => ({ kind: "date", display: "dddd" })))));
    assert.ok(refused(group([{ kind: "text", display: "text", text: "x".repeat(201) }])));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].kind = "group"))), "a group without members");
});

test("column widths fit the grid and hold numbers or null", () =>
{
    assert.ok(!refused(layoutWith((layout) => (layout.columnWidths = [80, null, 40]))));
    assert.ok(refused(layoutWith((layout) => (layout.columnWidths = [64, 64, 64, 64, 64]))), "longer than the grid");
    assert.ok(refused(layoutWith((layout) => (layout.columnWidths = [64, "wide"]))));
    assert.ok(refused(layoutWith((layout) => (layout.columnWidths = "none"))));
});

test("choices are checked against their lists", () =>
{
    assert.ok(refused(layoutWith((layout) => (layout.rowAlign = "middle"))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[0].clockStyle = "sundial"))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[0].textStyle = "braille"))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[0].progressUnit = "week"))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].iconStyle = "3d"))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].calendar = { range: "year" }))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].calendar = { eveningHour: 24 }))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[1].calendar = "all"))));
    assert.ok(refused(layoutWith((layout) => (layout.blocks[0].clockStyle = "toString"))), "inherited names are no choice");
});

test("fields of older versions are dropped", () =>
{
    const layout = validator.validated(layoutWith((draft) =>
    {
        draft.rowHeight = 56;
        draft.rowHeights = [60, null];
        draft.rowHeightOverrides = [60, null];
        draft.rowAligns = ["top", null];
        draft.columnGaps = [2, null, null];
        draft.rowGaps = [2];
        draft.blocks[1].padding = 8;
    }));
    assert.ok(layout);
    for (const field of ["rowHeight", "rowHeights", "rowHeightOverrides", "rowAligns", "columnGaps", "rowGaps"])
    {
        assert.equal(field in layout, false, field);
    }
    assert.equal("padding" in layout.blocks[1], false);
});

test("a progress bar cannot be a group member", () =>
{
    const group = (item: Partial<GroupItem>) => layoutWith((layout) =>
    {
        layout.blocks[1] = { id: 2, kind: "group", x: 0, y: 1, w: 4, h: 1, display: "group", items: [{ kind: "date", display: "dddd" }, { kind: "clock", display: "HH:mm", ...item }] };
    });
    assert.ok(refused(group({ clockStyle: "progress" })));
    assert.ok(!refused(group({ clockStyle: "progress", progressShape: "ring" })));
});

// Every layout the editor can build, the way it is stored (JSON drops unset fields).
function editorLayouts(): ClockLayout[]
{
    const textStyles: TextStyle[] = ["flip", "text", "segment", "dots", "nixie"];
    const clockStyles: ClockStyle[] = ["digital", "analogMinimal", "analogClassic", "analogFine", "rings", "progress"];
    const progressVariants: [ProgressShape, ProgressUnit, ProgressMotion][] = [["bar", "minute", "smooth"], ["ring", "hour", "stepped"], ["dots", "day", "smooth"]];

    const blocks: LayoutBlock[] = [];
    for (const definition of BLOCK_DEFINITIONS)
    {
        const displays = definition.displayOptions.map((option) => option.id);
        if (definition.supportsCustomFormat)
        {
            displays.push("custom");
        }
        for (const display of displays)
        {
            const block: LayoutBlock = { id: 1, kind: definition.kind, x: 0, y: 0, ...definition.defaultSize, ...definition.defaults, display };
            blocks.push(block);
            for (const style of textStyles)
            {
                blocks.push({ ...block, ...withTextStyle(block, style) });
            }
            if (definition.kind === "clock")
            {
                for (const style of clockStyles)
                {
                    blocks.push({ ...block, ...withClockStyle(style) });
                }
                for (const [progressShape, progressUnit, progressMotion] of progressVariants)
                {
                    blocks.push({ ...block, ...withClockStyle("progress"), progressShape, progressUnit, progressMotion });
                }
            }
        }
    }
    const layouts: ClockLayout[] = blocks.map((block) => ({ columns: GRID_LIMITS.maxColumns, rows: 1, blocks: [block] }));

    // Every field at once: `Required` makes this fail to compile when the model gains a field,
    // so a new field gets a rule in LayoutValidator and a place in this test.
    const calendar: Required<CalendarBlockSettings> = {
        sources: ["work", "bins"],
        keywords: "Bin, Paper",
        range: "days",
        days: 14,
        maxEntries: 5,
        eveningHour: 18,
        timeStyle: "weekday",
        allDay: false,
        icons: true,
        colorDot: false,
        emptyText: "Free",
    };
    const member: Required<GroupItem> = {
        kind: "clock",
        display: "custom",
        customFormat: "HH:mm:ss",
        text: "Hi",
        weatherIcon: false,
        clockStyle: "rings",
        calendar,
        textStyle: "nixie",
        progressShape: "ring",
        progressUnit: "day",
        progressMotion: "stepped",
    };
    const everything: Required<LayoutBlock> = {
        ...member,
        id: 7,
        kind: "group",
        x: 1,
        y: 1,
        w: 3,
        h: 2,
        display: "group",
        items: [member, { kind: "calendar", display: "week", calendar }, { kind: "weather", display: "temp", weatherIcon: true }],
        itemGap: 0.9,
        direction: "column",
        align: "left",
        iconStyle: "flat",
        flipUnit: "word",
        font: "\"JetBrains Mono Variable\", monospace",
        color: "#fafafaff",
        glowColor: "#ff8800ff",
        hourRingColor: "#112233ff",
        minuteRingColor: "#223344ff",
        secondRingColor: "#334455ff",
        labelSize: 60,
        dialColor: "#000000ff",
        handColor: "#ffffffff",
        secondHandColor: "#ff0000ff",
        cardColor: "#1f1f1fff",
        cardRadius: 16,
        paddingX: 8,
        paddingY: 4,
        background: true,
        backgroundColor: "#3f3f46ff",
        backgroundRadius: 12,
        textSize: 82,
        letterSpacing: -0.14,
        offsetX: -3,
        offsetY: 5,
        barColor: "#00ff00ff",
        barTrackColor: "#ffffff26",
        barThickness: 4,
        barRadius: 2,
    };
    const everyLayoutField: Required<ClockLayout> = {
        columns: 4,
        rows: 3,
        blocks: [everything],
        columnGap: 3,
        rowGap: 0,
        columnWidth: 70,
        columnWidths: [null, 96, null, 40],
        rowAlign: "bottom",
    };
    layouts.push(everyLayoutField);

    // Grouped in the editor: one block of every kind side by side, then merged.
    const kinds = BLOCK_DEFINITIONS.map((definition, index): LayoutBlock => ({ id: index + 1, kind: definition.kind, x: index, y: 0, w: 1, h: 1, ...definition.defaults }));
    const row: ClockLayout = { columns: GRID_LIMITS.maxColumns, rows: 1, blocks: kinds };
    const grouped = new LayoutGrid(row).grouped(kinds.map((block) => block.id));
    assert.ok(grouped, "the editor groups one block of every kind");
    layouts.push(grouped);

    layouts.push(new LayoutGrid(structuredClone(DEFAULT_LAYOUT)).withColumnWidth(1, 90));
    return layouts.map((layout) => JSON.parse(JSON.stringify(layout)));
}

test("every layout the editor builds passes unchanged", () =>
{
    for (const layout of editorLayouts())
    {
        assert.deepEqual(validator.validated(structuredClone(layout)), layout, JSON.stringify(layout));
    }
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

test("the editor never builds a group the validator refuses", () =>
{
    // One group with the most members allowed, and a text block beside it.
    const members = Array.from({ length: CONTENT_LIMITS.groupMembers }, () => ({ kind: "date" as const, display: "dddd" }));
    const layout: ClockLayout = {
        columns: 4,
        rows: 1,
        blocks: [
            { id: 1, kind: "group", x: 0, y: 0, w: 2, h: 1, display: "group", items: members },
            { id: 2, kind: "text", x: 2, y: 0, w: 2, h: 1, display: "text", text: "Hi" },
        ],
    };
    assert.ok(validator.validated(structuredClone(layout)), "a full group is valid");
    const grid = new LayoutGrid(layout);
    assert.equal(grid.mergedInto(1, 2, false), null, "dropping onto a full group");
    assert.equal(grid.mergedInto(2, 1, true), null, "dropping a full group onto a block");
    assert.equal(grid.groupable([1, 2]), null, "grouping a full group with a block");
    assert.equal(grid.grouped([1, 2]), null);

    const tooMany = { ...layout, blocks: [{ ...layout.blocks[0], items: [...members, members[0]] }, layout.blocks[1]] };
    assert.equal(validator.validated(tooMany), null);
});

test("text limits are the ones the editor's fields enforce", () =>
{
    const text = (value: string) => layoutWith((layout) => (layout.blocks[1].text = value));
    assert.ok(!refused(text("x".repeat(CONTENT_LIMITS.textLength))));
    assert.ok(refused(text("x".repeat(CONTENT_LIMITS.textLength + 1))));
});
