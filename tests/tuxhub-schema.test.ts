// Runs with `npm test` (node --test, no extra dependency).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { schema, check, checkStored, Refusal } from "../src/tuxhub/tuxhubSchema.ts";

const fields = (s: ReturnType<typeof schema>) => s.sections.flatMap((sec) => sec.fields);
const field = (key: string, s = schema("en")) => 
{
    const f = fields(s).find((f) => f.key === key);
    assert.ok(f, `field ${key} is missing`);
    return f;
};

test("schema covers every stored setting except caches", () => 
{
    const atoms = readFileSync(new URL("../src/settings/atoms.ts", import.meta.url), "utf8");
    const stored = [...atoms.matchAll(/atomWithStorage(?:<[^>]*>)?\("([^"]+)"/g)].map((m) => m[1]);
    // Caches, the block layout and the saved layouts, which only the styling window edits, and the picked weather
    // place (tuxhub sets the location as text, which replaces the place). Calendars hold secret
    // links and are managed in the settings window only.
    const caches = ["weatherReport", "sunDays", "clockLayout", "savedLayouts", "activeLayoutId", "weatherPlace", "calendarSources", "calendarFeeds"];
    const keys = fields(schema("en")).map((f) => f.key);
    for (const key of stored.filter((k) => !caches.includes(k))) 
    {
        assert.ok(keys.includes(key), `${key} is not in the schema`);
    }
    assert.ok(keys.includes("overlayMode"));
});

test("schema stays within the limits tuxhub checks", () => 
{
    for (const locale of ["en", "de"]) 
    {
        const s = schema(locale);
        const ident = /^[A-Za-z0-9_.-]{1,64}$/;
        assert.ok(s.sections.length <= 32 && s.actions.length <= 32);
        const keys = new Set<string>();
        for (const sec of s.sections) 
        {
            assert.match(sec.id, ident);
            assert.ok(sec.label.length > 0 && sec.label.length <= 120);
            assert.ok(sec.fields.length <= 200);
            for (const f of sec.fields) 
            {
                assert.match(f.key, ident);
                assert.ok(!keys.has(f.key), `${f.key} appears twice`);
                keys.add(f.key);
                assert.ok(f.label.length > 0 && f.label.length <= 120, f.key);
                assert.ok((f.help ?? "").length <= 500, f.key);
                assert.ok(["toggle", "number", "select", "text", "color"].includes(f.type));
                if (f.type === "select") 
                {
                    const values = f.options!.map((o) => o.value);
                    assert.ok(values.length >= 1 && values.length <= 200);
                    assert.equal(new Set(values).size, values.length, `${f.key} repeats an option`);
                    assert.ok(f.options!.every((o) => o.label.length > 0 && o.label.length <= 120));
                }
                if (f.type === "number") assert.ok(f.min! <= f.max!);
                if (f.type === "text") assert.ok(f.max_length! >= 1 && f.max_length! <= 65536);
            }
        }
        for (const a of s.actions) 
        {
            assert.match(a.id, ident);
            assert.ok(a.label.length > 0 && a.label.length <= 120);
        }
    }
});

test("labels come in English and German, anything else falls back to English", () => 
{
    assert.equal(field("textColor", schema("en")).label, "Default text color");
    assert.equal(field("textColor", schema("de")).label, "Standard-Textfarbe");
    assert.deepEqual(schema("fr"), schema("en"));
    assert.deepEqual(schema("de-AT"), schema("de"));
    const en = JSON.stringify(schema("en"));
    const de = JSON.stringify(schema("de"));
    assert.notEqual(en, de);
});

test("context menu entries and actions are part of the schema", () => 
{
    for (const key of ["autostart", "hideInTaskbar", "alwaysOnTop"]) 
    {
        assert.equal(field(key).type, "toggle");
    }
    const ids = schema("en").actions.map((a) => a.id);
    assert.deepEqual(ids, ["open-styling", "reset", "quit"]);
});

test("valid values are accepted as they are applied", () => 
{
    assert.equal(check("clockScale", 150), 150);
    assert.equal(check("clockScale", 150.4), 150);
    assert.equal(check("clockCornerRadius", 0), 0);
    assert.equal(check("textColor", "#FF0000AA"), "#ff0000aa");
    assert.equal(check("textColor", "#ff0000"), "#ff0000ff");
    assert.equal(check("textFont", "Georgia, serif"), "Georgia, serif");
    assert.equal(check("lang", "de"), "de");
    assert.equal(check("overlayMode", "x11"), "x11");
    assert.equal(check("weatherLocation", ""), "");
});

function refused(key: string, value: unknown, locale = "en") 
{
    try 
    {
        check(key, value, locale);
    }
    catch (e) 
    {
        assert.ok(e instanceof Refusal, `expected a Refusal, got ${e}`);
        assert.equal(e.field, key);
        assert.ok(e.message.length > 0 && e.message.length <= 500);
        return e.message;
    }
    assert.fail(`${key} = ${JSON.stringify(value)} was accepted`);
}

test("values that do not fit are refused and name the field", () => 
{
    refused("clockScale", 29);
    refused("clockScale", 301);
    refused("clockScale", "40");
    refused("clockScale", Number.NaN);
    refused("clockPadding", -1);
    refused("textColor", "red");
    refused("textColor", "#ff00");
    refused("textColor", 0xff0000);
    refused("textFont", "Comic Sans MS");
    refused("lang", "xx");
    refused("overlayMode", "wayland");
    refused("weatherUnit", "K");
    refused("autostart", "yes");
    refused("weatherLocation", "x".repeat(201));
});

test("unknown keys and the block layout are refused", () => 
{
    refused("weatherData", { temp: 1 });
    refused("__proto__", 1);
    refused("clockLayout", { columns: 2 });
});

test("refusals are worded in the requested language", () => 
{
    const en = refused("clockScale", 500, "en");
    const de = refused("clockScale", 500, "de");
    assert.notEqual(en, de);
    assert.match(en, /30/);
    assert.match(de, /300/);
});

test("settings.set may write schema fields and the layout, nothing else", () =>
{
    assert.equal(checkStored("clockScale", 120.4), 120);
    assert.equal(checkStored("textColor", "#FF0000"), "#ff0000ff");

    const layout = { columns: 4, rows: 1, blocks: [{ id: 1, kind: "text", x: 0, y: 0, w: 2, h: 1, display: "text", text: "Hi", extra: 1 }] };
    assert.deepEqual(checkStored("clockLayout", layout), {
        columns: 4,
        rows: 1,
        blocks: [{ id: 1, kind: "text", x: 0, y: 0, w: 2, h: 1, display: "text", text: "Hi" }],
    });

    const refusedKeys: [string, unknown][] = [
        ["clockLayout", { columns: 99, rows: 1, blocks: [] }],
        ["clockLayout", "four columns"],
        ["weatherReport", null],
        ["sunDays", { days: [] }],
        ["clockScale", "big"],
        ["__proto__", {}],
        ["nope", 1],
    ];
    for (const [key, value] of refusedKeys)
    {
        assert.throws(() => checkStored(key, value), (error: unknown) => error instanceof Refusal && error.field === key, key);
    }
    assert.throws(() => checkStored("clockLayout", null, "de"), /Layout/);
});

test("reset is offered as a dangerous action that asks first", () =>
{
    for (const locale of ["en", "de"])
    {
        const reset = schema(locale).actions.find((action) => action.id === "reset");
        assert.ok(reset, "reset action is missing");
        assert.equal(reset.danger, true);
        assert.ok(reset.confirm && reset.confirm.length <= 500);
    }
    assert.equal(schema("en").actions.find((action) => action.id === "quit")?.danger, undefined);
});

test("calendar links and caches stay out of reach of the socket", () =>
{
    // calendarSources hold secret ICS links, calendarFeeds the events read from them.
    const secret = ["calendarSources", "calendarFeeds"];
    for (const key of [...secret, "weatherPlace", "savedLayouts", "activeLayoutId"])
    {
        assert.throws(() => checkStored(key, []), (error: unknown) => error instanceof Refusal && error.field === key, key);
    }
    // `settings.get` and `settings-changed` only carry the keys of these two maps.
    const bridge = readFileSync(new URL("../src/tuxhub/TuxhubBridge.ts", import.meta.url), "utf8");
    for (const atom of ["CALENDAR_SOURCES", "CALENDAR_FEEDS"])
    {
        assert.equal(bridge.includes(`ATOMS.${atom}`), false, atom);
    }
});
