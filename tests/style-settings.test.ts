// Runs with `npm test`: which look settings the inspector shows for each clock style.
import { test } from "node:test";
import assert from "node:assert/strict";
import { effectsOf, effectVariantsOf, settingsOf, STYLE_COLOR_FIELDS, withClockStyle, withTextStyle } from "../src/blocks/StyleSettings.ts";
import { LayoutGrid, type LayoutBlock } from "../src/layout/ClockLayout.ts";

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
    assert.deepEqual(shown(clock({ textStyle: "text" })), ["align", "color", "font", "letterSpacing", "textSize"]);
    assert.deepEqual(shown(clock({})), ["align", "color", "font", "letterSpacing", "textSize"], "unset is plain text");
    assert.deepEqual(shown(clock({ kind: "date", textStyle: "flip" })), ["align", "cards", "color", "flipUnit", "font", "letterSpacing", "textSize"]);
});

test("lit styles take the glow color, a size and an effect, no font or text color", () =>
{
    for (const textStyle of ["segment", "dots", "nixie"] as const)
    {
        assert.deepEqual(shown(clock({ textStyle })), ["align", "effect", "glowColor", "size"]);
        assert.deepEqual(shown(clock({ kind: "weather", display: "temp", textStyle })), ["align", "effect", "glowColor", "size"]);
    }
    assert.deepEqual(shown(clock({ textStyle: "segment", clockStyle: "analogFine" })), ["align", "dialColor", "handColor", "size"], "a face ignores the text style");
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
        textStyle: "segment",
        items: [{ kind: "clock", display: "HH:mm", clockStyle: "analogFine" }, { kind: "date", display: "dddd", textStyle: "text" }],
    });
    assert.deepEqual(shown(group), ["align", "color", "dialColor", "font", "handColor", "letterSpacing", "textSize"]);
});

test("switching the clock style drops the old style's colors", () =>
{
    const block = clock({ clockStyle: "analogClassic", dialColor: "#000000", handColor: "#ff0000", color: "#00ff00", backgroundColor: "#123456" });
    const switched = JSON.parse(JSON.stringify({ ...block, ...withClockStyle("rings") })) as LayoutBlock;
    assert.equal(switched.clockStyle, "rings");
    for (const field of STYLE_COLOR_FIELDS)
    {
        assert.equal(field in switched, false, field);
    }
    assert.equal(switched.backgroundColor, "#123456");
});

test("picking a text style: a clock goes back to digits, a group's members share it", () =>
{
    const analog = clock({ clockStyle: "analogFine", dialColor: "#000000" });
    const digits = JSON.parse(JSON.stringify({ ...analog, ...withTextStyle(analog, "dots") })) as LayoutBlock;
    assert.deepEqual([digits.clockStyle, digits.textStyle, digits.dialColor], [undefined, "dots", undefined]);

    const group = clock({
        kind: "group",
        items: [{ kind: "clock", display: "HH:mm", textStyle: "flip" }, { kind: "weather", display: "temp", weatherIcon: true }],
    });
    const patch = withTextStyle(group, "segment");
    assert.equal(patch.textStyle, "segment");
    assert.deepEqual(patch.items!.map((item) => item.textStyle), [undefined, undefined]);
    assert.equal(patch.iconStyle, "flat", "LCD suggests flat icons");
    assert.equal(withTextStyle({ ...group, iconStyle: "colored" }, "segment").iconStyle, undefined, "a chosen icon style stays");
    assert.equal(withTextStyle(group, "nixie").iconStyle, undefined);
});

test("padding works for every block; unset it is only there with an own background", () =>
{
    assert.deepEqual(LayoutGrid.paddingOf(clock({ paddingX: 6, paddingY: 3 })), { x: 6, y: 3 });
    assert.deepEqual(LayoutGrid.paddingOf(clock({})), { x: 0, y: 0 });
    assert.deepEqual(LayoutGrid.paddingOf(clock({ background: true })), { x: 8, y: 4 });
    assert.deepEqual(LayoutGrid.paddingOf(clock({ paddingY: 4 })), { x: 0, y: 4 });
});

test("effects follow the text style and are dropped by a style without them", () =>
{
    assert.deepEqual(effectsOf(clock({ textStyle: "dots" })), ["breathe", "sparkle", "scan"]);
    assert.deepEqual(effectsOf(clock({ textStyle: "flip" })), []);
    assert.deepEqual(effectsOf(clock({ textStyle: "nixie", clockStyle: "analogFine" })), [], "a face has no text effects");
    assert.ok(!("effect" in withTextStyle(clock({ textStyle: "dots", effect: "scan" }), "segment")), "LCD scans too: kept");
    const patch = withTextStyle(clock({ textStyle: "dots", effect: "breathe" }), "nixie");
    assert.ok("effect" in patch && patch.effect === undefined);
});

test("variants follow the effect and style and are dropped where they no longer exist", () =>
{
    assert.deepEqual(effectVariantsOf(clock({ textStyle: "dots", effect: "scan" })), ["rightward", "leftward", "pingpong"]);
    assert.deepEqual(effectVariantsOf(clock({ textStyle: "segment", effect: "flicker" })), [], "LCD flicker has none");
    assert.deepEqual(effectVariantsOf(clock({ textStyle: "nixie", effect: "flicker" })), ["apart", "together"]);
    assert.deepEqual(effectVariantsOf(clock({ textStyle: "dots" })), []);
    assert.ok(!("effectVariant" in withTextStyle(clock({ textStyle: "dots", effect: "scan", effectVariant: "pingpong" }), "segment")), "LCD scans back and forth too");
    const patch = withTextStyle(clock({ textStyle: "nixie", effect: "flicker", effectVariant: "together" }), "segment");
    assert.ok("effectVariant" in patch && patch.effectVariant === undefined, "LCD flicker has no variants");
    const dropped = withTextStyle(clock({ textStyle: "dots", effect: "breathe", effectVariant: "waveRight" }), "nixie");
    assert.ok("effect" in dropped && "effectVariant" in dropped && dropped.effectVariant === undefined);
});
