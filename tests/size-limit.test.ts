// Runs with `npm test` (node --test, no extra dependency).
import { test } from "node:test";
import assert from "node:assert/strict";
import { maxSizeShare, type FitMeasure } from "../src/clock/SizeLimit.ts";

// Content 100 x 20 px without letter spacing in a 200 x 100 px room, row following the block.
const BASE: FitMeasure = {
    spacedWidth: 100,
    unspacedWidth: 100,
    height: 20,
    areaWidth: 200,
    areaHeight: 100,
    heightFollows: true,
};

const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test("without letter spacing the content grows until it fills the width", () =>
{
    near(maxSizeShare(BASE), 1);
});

test("negative letter spacing: the unspaced text still has to fit the width", () =>
{
    // The default group: spaced 201.5, unspaced 256 px in a 256 px room -> 79 %.
    near(maxSizeShare({ ...BASE, spacedWidth: 201.5, unspacedWidth: 256, areaWidth: 256 }), 201.5 / 256);
});

test("positive letter spacing may reach past the block until the plain text fills it", () =>
{
    near(maxSizeShare({ ...BASE, spacedWidth: 150 }), 1.5);
});

test("a block over several rows limits by its height", () =>
{
    // Height fit 100 / 20 = 5 times, width fit 2 times: never the height limit.
    near(maxSizeShare({ ...BASE, heightFollows: false }), 1);
    // A low room: height fit 30 / 20 = 1.5 times against 2 times for the width.
    near(maxSizeShare({ ...BASE, areaHeight: 30, heightFollows: false }), 0.75);
    // The same low room, but the row grows with the block: the height is no limit.
    near(maxSizeShare({ ...BASE, areaHeight: 30 }), 1);
});
