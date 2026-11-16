// Runs with `npm test`: saving, renaming, duplicating and removing layouts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LAYOUT, type ClockLayout } from "../src/layout/ClockLayout.ts";
import { LayoutLibrary } from "../src/layout/LayoutLibrary.ts";

const wide: ClockLayout = { ...DEFAULT_LAYOUT, columns: 6 };

test("new layouts get the next id and a unique name", () =>
{
    const first = new LayoutLibrary([]).withNew("Desk", DEFAULT_LAYOUT);
    assert.equal(first.id, 1);
    const second = new LayoutLibrary(first.layouts).withNew("Desk", wide);
    assert.equal(second.id, 2);
    assert.deepEqual(second.layouts.map((saved) => saved.name), ["Desk", "Desk 2"]);
    const third = new LayoutLibrary(second.layouts).withNew(" Desk ", wide);
    assert.equal(third.layouts[2].name, "Desk 3");
});

test("changes are measured against the saved layout, ignoring key order", () =>
{
    const library = new LayoutLibrary(new LayoutLibrary([]).withNew("Desk", DEFAULT_LAYOUT).layouts);
    const reordered = JSON.parse(JSON.stringify({ blocks: DEFAULT_LAYOUT.blocks, rowHeightOverrides: DEFAULT_LAYOUT.rowHeightOverrides, rows: DEFAULT_LAYOUT.rows, columns: 4, rowGap: 0, columnGap: 0 }));
    assert.equal(library.hasChanges(1, reordered), false);
    assert.equal(library.hasChanges(1, wide), true);
    assert.equal(library.hasChanges(null, DEFAULT_LAYOUT), true);
    assert.equal(library.hasChanges(7, DEFAULT_LAYOUT), true);
});

test("saving overwrites only that layout", () =>
{
    const added = new LayoutLibrary(new LayoutLibrary([]).withNew("A", DEFAULT_LAYOUT).layouts).withNew("B", DEFAULT_LAYOUT);
    const saved = new LayoutLibrary(added.layouts).withSaved(1, wide);
    assert.equal(saved[0].layout.columns, 6);
    assert.equal(saved[1].layout.columns, 4);
});

test("rename keeps names unique and ignores empty names", () =>
{
    const layouts = new LayoutLibrary(new LayoutLibrary([]).withNew("A", DEFAULT_LAYOUT).layouts).withNew("B", DEFAULT_LAYOUT).layouts;
    const library = new LayoutLibrary(layouts);
    assert.equal(library.withRenamed(2, "A")[1].name, "A 2");
    assert.equal(library.withRenamed(2, "  ")[1].name, "B");
    assert.equal(library.withRenamed(2, "B")[1].name, "B");
    assert.equal(library.withRenamed(1, "Night")[0].name, "Night");
});

test("duplicate copies the layout, remove drops it", () =>
{
    const library = new LayoutLibrary(new LayoutLibrary([]).withNew("Desk", wide).layouts);
    const duplicate = library.withDuplicate(1, "Desk copy");
    assert.ok(duplicate);
    assert.equal(duplicate.id, 2);
    assert.equal(duplicate.layouts[1].layout.columns, 6);
    assert.equal(library.withDuplicate(9, "x"), null);
    assert.deepEqual(new LayoutLibrary(duplicate.layouts).without(1).map((saved) => saved.id), [2]);
});
