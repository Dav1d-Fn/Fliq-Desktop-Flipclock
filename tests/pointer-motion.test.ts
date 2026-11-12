// Runs with `npm test` (node --test, no extra dependency).
import { test } from "node:test";
import assert from "node:assert/strict";
import { PointerMotion } from "../src/overlay/PointerMotion.ts";

test("no sample yet gives no position", () =>
{
    assert.equal(new PointerMotion().positionAt(100), null);
});

test("a single sample is returned as is", () =>
{
    const motion = new PointerMotion();
    motion.record(10, 20, 100);
    assert.deepEqual(motion.positionAt(116), { x: 10, y: 20 });
});

test("a steady movement is continued to the frame time", () =>
{
    const motion = new PointerMotion();
    // One pixel per millisecond to the right.
    for (let time = 0; time <= 40; time += 4)
    {
        motion.record(time, 0, time);
    }
    assert.deepEqual(motion.positionAt(50), { x: 50, y: 0 });
});

test("the guess never reaches further than the lookahead limit", () =>
{
    const motion = new PointerMotion();
    motion.record(0, 0, 0);
    motion.record(10, 0, 10);
    // 40 ms after the last sample, but only 20 ms are guessed.
    assert.deepEqual(motion.positionAt(50), { x: 30, y: 0 });
});

test("a pointer that went quiet is taken as stopped", () =>
{
    const motion = new PointerMotion();
    motion.record(0, 0, 0);
    motion.record(10, 0, 10);
    assert.deepEqual(motion.positionAt(100), { x: 10, y: 0 });
});

test("old samples drop out of the speed window", () =>
{
    const motion = new PointerMotion();
    // Fast at first, then standing still for longer than the window.
    motion.record(0, 0, 0);
    motion.record(100, 0, 10);
    for (let time = 20; time <= 80; time += 10)
    {
        motion.record(100, 0, time);
    }
    assert.deepEqual(motion.positionAt(90), { x: 100, y: 0 });
});
