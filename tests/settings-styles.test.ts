// Runs with `npm test` (node --test, no extra dependency).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const styling = read("../src/windows/styling/styling.css");
const layoutEditor = read("../src/windows/styling/layoutEditor/layoutEditor.css");

// The blocks that define the color variables: `:root { ... }` and its dark counterpart.
const variableBlocks = /:root[^{]*\{[^}]*\}/g;
const literalColor = /#[0-9a-fA-F]{3,8}\b|rgba?\(/g;

test("the settings styles take every color from a variable", () =>
{
    // A literal color would stay the same in the dark appearance inside tuxhub.
    for (const [name, css] of [["styling.css", styling.replace(variableBlocks, "")], ["layoutEditor.css", layoutEditor]])
    {
        assert.deepEqual(css.match(literalColor) ?? [], [], `${name} has colors outside the variable blocks`);
    }
});

test("the dark appearance defines only variables the light one has", () =>
{
    const [light, dark] = styling.match(variableBlocks) ?? [];
    assert.ok(light && dark, "light and dark variable blocks");
    assert.match(dark, /^:root\[data-mantine-color-scheme="dark"\]/);
    const names = (block: string) => new Set([...block.matchAll(/(--fliq-[\w-]+)\s*:/g)].map((match) => match[1]));
    const lightNames = names(light);
    for (const name of names(dark))
    {
        assert.ok(lightNames.has(name), `${name} is only defined for dark`);
    }
});

test("every variable the styles use is defined", () =>
{
    const defined = new Set([...styling.matchAll(/(--fliq-[\w-]+)\s*:/g)].map((match) => match[1]));
    for (const [, name] of (styling + layoutEditor).matchAll(/var\((--fliq-[\w-]+)/g))
    {
        assert.ok(defined.has(name), `${name} is used but not defined`);
    }
});
