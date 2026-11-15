// Runs with `npm test`: which look settings the inspector shows for each clock style.
import { test } from "node:test";
import assert from "node:assert/strict";
import { settingsOf, STYLE_COLOR_FIELDS, withClockStyle } from "../src/blocks/StyleSettings.ts";
import type { LayoutBlock } from "../src/layout/ClockLayout.ts";

function clock(extra: Partial<LayoutBlock>): LayoutBlock
{
    return { id: 1, kind: "clock", x: 0, y: 0, w: 2, h: 1, display: "HH:mm", ...extra };
}

function shown(block: LayoutBlock): string[]
{
    return [...settingsOf(block)].sort();
}

test("text styles show font, color, spacing and text size; flip also its cards", () =>
{
    assert.deepEqual(shown(clock({ clockStyle: "text" })), ["align", "color", "font", "letterSpacing", "textSize"]);
    assert.ok(settingsOf(clock({})).has("cards"));
});

test("lit styles take the glow color and a size, no font or text color", () =>
{
    for (const clockStyle of ["segment", "dots", "nixie"] as const)
    {
        assert.deepEqual(shown(clock({ clockStyle })), ["align", "glowColor", "size"]);
    }
});

test("the second hand and second ring color only with seconds", () =>
{
    assert.ok(!settingsOf(clock({ clockStyle: "analogFine" })).has("secondHandColor"));
    assert.ok(settingsOf(clock({ clockStyle: "analogFine", display: "HH:mm:ss" })).has("secondHandColor"));
    assert.ok(!settingsOf(clock({ clockStyle: "rings" })).has("secondRingColor"));
    assert.ok(settingsOf(clock({ clockStyle: "rings", display: "custom", customFormat: "H:mm:ss" })).has("secondRingColor"));
    assert.deepEqual(shown(clock({ clockStyle: "rings" })), ["align", "color", "font", "hourRingColor", "labelSize", "minuteRingColor", "size"]);
});

test("progress: the bar has no size, ring and dots no bar shape", () =>
{
    assert.deepEqual(shown(clock({ clockStyle: "progress" })), ["barShape", "progressColors"]);
    assert.deepEqual(shown(clock({ clockStyle: "progress", progressShape: "ring" })), ["align", "progressColors", "size"]);
});

test("a group shows what any member uses, text size wins over size", () =>
{
    const group = clock({
        kind: "group",
        items: [{ kind: "clock", display: "HH:mm", clockStyle: "segment" }, { kind: "date", display: "dddd" }],
    });
    assert.deepEqual(shown(group), ["align", "color", "font", "glowColor", "letterSpacing", "textSize"]);
});

test("switching the clock style drops the old style's colors", () =>
{
    const block = clock({ clockStyle: "analogClassic", dialColor: "#000000", handColor: "#ff0000", color: "#00ff00", backgroundColor: "#123456" });
    const switched = JSON.parse(JSON.stringify({ ...block, ...withClockStyle("segment") })) as LayoutBlock;
    assert.equal(switched.clockStyle, "segment");
    for (const field of STYLE_COLOR_FIELDS)
    {
        assert.equal(field in switched, false, field);
    }
    assert.equal(switched.backgroundColor, "#123456");
});
