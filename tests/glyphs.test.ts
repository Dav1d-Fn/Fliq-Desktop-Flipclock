// Runs with `npm test`: every character the LCD and dot matrix text styles promise has a glyph.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DOT_GLYPHS, dotText } from "../src/clock/faces/DotGlyphs.ts";
import { FOURTEEN_SEGMENT_GLYPHS, SEGMENT_DOTS, segmentGlyphs, segmentText, SEVEN_SEGMENT_GLYPHS } from "../src/clock/faces/SegmentGlyphs.ts";

const SUPPORTED = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÄÖÜäöüß0123456789.,:-/°% ";

test("the LCD draws every supported character", () =>
{
    for (const character of SUPPORTED)
    {
        for (const shown of segmentText(character))
        {
            assert.ok(shown in FOURTEEN_SEGMENT_GLYPHS || SEGMENT_DOTS.includes(shown), `no LCD glyph for "${character}"`);
        }
    }
    assert.equal(segmentText("Straße – Öl…"), "STRASSE - OL...");
});

test("the LCD keeps seven segments for text without letters", () =>
{
    assert.equal(segmentGlyphs(segmentText("12:34")), SEVEN_SEGMENT_GLYPHS);
    assert.equal(segmentGlyphs(segmentText("-3 °")), SEVEN_SEGMENT_GLYPHS);
    assert.equal(segmentGlyphs(segmentText("12 °C")), FOURTEEN_SEGMENT_GLYPHS);
    assert.equal(segmentGlyphs(segmentText("50%")), FOURTEEN_SEGMENT_GLYPHS);
    for (const [character, lit] of Object.entries(SEVEN_SEGMENT_GLYPHS))
    {
        assert.ok(lit.every((segment) => "abcdefg".includes(segment)), character);
    }
});

test("the dot matrix draws every supported character, umlauts included", () =>
{
    for (const character of SUPPORTED)
    {
        for (const shown of dotText(character))
        {
            assert.ok(shown in DOT_GLYPHS, `no dot glyph for "${character}"`);
        }
    }
    assert.equal(dotText("Grüße"), "GRÜSSE");
});

test("dot glyphs are seven rows of the same width", () =>
{
    for (const [character, rows] of Object.entries(DOT_GLYPHS))
    {
        assert.equal(rows.length, 7, character);
        assert.ok(rows.every((row) => row.length === rows[0].length && /^[01]+$/.test(row)), character);
    }
});
