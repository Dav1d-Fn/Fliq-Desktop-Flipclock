// Runs with `npm test` (node --test, no extra dependency).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { schema, check, Refusal } from "../src/tuxhub-schema.ts";

const ON = { secondRowEnabled: true };

const fields = (s: ReturnType<typeof schema>) => s.sections.flatMap((sec) => sec.fields);
const field = (key: string, s = schema("en", ON)) => {
  const f = fields(s).find((f) => f.key === key);
  assert.ok(f, `field ${key} is missing`);
  return f;
};

test("schema covers every stored setting except caches", () => {
  const atoms = readFileSync(new URL("../src/pages/atoms.ts", import.meta.url), "utf8");
  const stored = [...atoms.matchAll(/atomWithStorage\("([^"]+)"/g)].map((m) => m[1]);
  const caches = ["weatherData", "sunTimes"];
  const keys = fields(schema("en", ON)).map((f) => f.key);
  for (const key of stored.filter((k) => !caches.includes(k))) {
    assert.ok(keys.includes(key), `${key} is not in the schema`);
  }
  assert.ok(keys.includes("overlayMode"));
});

test("schema stays within the limits tuxhub checks", () => {
  for (const locale of ["en", "de"]) {
    const s = schema(locale, ON);
    const ident = /^[A-Za-z0-9_.-]{1,64}$/;
    assert.ok(s.sections.length <= 32 && s.actions.length <= 32);
    const keys = new Set<string>();
    for (const sec of s.sections) {
      assert.match(sec.id, ident);
      assert.ok(sec.label.length > 0 && sec.label.length <= 120);
      assert.ok(sec.fields.length <= 200);
      for (const f of sec.fields) {
        assert.match(f.key, ident);
        assert.ok(!keys.has(f.key), `${f.key} appears twice`);
        keys.add(f.key);
        assert.ok(f.label.length > 0 && f.label.length <= 120, f.key);
        assert.ok((f.help ?? "").length <= 500, f.key);
        assert.ok(["toggle", "number", "select", "text", "color"].includes(f.type));
        if (f.type === "select") {
          const values = f.options!.map((o) => o.value);
          assert.ok(values.length >= 1 && values.length <= 200);
          assert.equal(new Set(values).size, values.length, `${f.key} repeats an option`);
          assert.ok(f.options!.every((o) => o.label.length > 0 && o.label.length <= 120));
        }
        if (f.type === "number") assert.ok(f.min! <= f.max!);
        if (f.type === "text") assert.ok(f.max_length! >= 1 && f.max_length! <= 65536);
      }
    }
    for (const a of s.actions) {
      assert.match(a.id, ident);
      assert.ok(a.label.length > 0 && a.label.length <= 120);
    }
  }
});

test("labels come in English and German, anything else falls back to English", () => {
  assert.equal(field("textColor", schema("en", ON)).label, "Text color");
  assert.equal(field("textColor", schema("de", ON)).label, "Textfarbe");
  assert.deepEqual(schema("fr", ON), schema("en", ON));
  assert.deepEqual(schema("de-AT", ON), schema("de", ON));
  const en = JSON.stringify(schema("en", ON));
  const de = JSON.stringify(schema("de", ON));
  assert.notEqual(en, de);
});

test("context menu entries and actions are part of the schema", () => {
  for (const key of ["autostart", "hideInTaskbar", "alwaysOnTop"]) {
    assert.equal(field(key).type, "toggle");
  }
  const ids = schema("en", ON).actions.map((a) => a.id);
  assert.deepEqual(ids, ["open-styling", "quit"]);
});

test("second row fields follow the second row switch", () => {
  const second = ["secondRowGap", "secondRowClockTextSize", "secondRowFormat"];
  for (const key of second) {
    assert.ok(!field(key, schema("en", ON)).disabled);
    assert.equal(field(key, schema("en", { secondRowEnabled: false })).disabled, true);
  }
  assert.ok(!field("secondRowEnabled", schema("en", { secondRowEnabled: false })).disabled);
});

test("valid values are accepted as they are applied", () => {
  assert.equal(check("clockTextSize", 40, ON), 40);
  assert.equal(check("clockTextSize", 40.4, ON), 40);
  assert.equal(check("boxRounded", 0, ON), 0);
  assert.equal(check("textColor", "#FF0000AA", ON), "#ff0000aa");
  assert.equal(check("textColor", "#ff0000", ON), "#ff0000ff");
  assert.equal(check("textFont", "Georgia, serif", ON), "Georgia, serif");
  assert.equal(check("lang", "de", ON), "de");
  assert.equal(check("overlayMode", "x11", ON), "x11");
  assert.equal(check("secondRowEnabled", false, ON), false);
  assert.equal(check("weatherLocation", "", ON), "");
  assert.equal(check("format", "$FLIPTIME(HH:mm)", ON), "$FLIPTIME(HH:mm)");
});

function refused(key: string, value: unknown, opts = ON, locale = "en") {
  try {
    check(key, value, opts, locale);
  } catch (e) {
    assert.ok(e instanceof Refusal, `expected a Refusal, got ${e}`);
    assert.equal(e.field, key);
    assert.ok(e.message.length > 0 && e.message.length <= 500);
    return e.message;
  }
  assert.fail(`${key} = ${JSON.stringify(value)} was accepted`);
}

test("values that do not fit are refused and name the field", () => {
  refused("clockTextSize", 4);
  refused("clockTextSize", 101);
  refused("clockTextSize", "40");
  refused("clockTextSize", Number.NaN);
  refused("clockPadding", -1);
  refused("textColor", "red");
  refused("textColor", "#ff00");
  refused("textColor", 0xff0000);
  refused("textFont", "Comic Sans MS");
  refused("lang", "xx");
  refused("overlayMode", "wayland");
  refused("weatherUnit", "K");
  refused("autostart", "yes");
  refused("format", 5);
  refused("format", "x".repeat(1001));
  refused("seperatorString", "x".repeat(51));
  refused("weatherLocation", "x".repeat(201));
});

test("unknown keys and disabled fields are refused", () => {
  refused("weatherData", { temp: 1 });
  refused("__proto__", 1);
  refused("secondRowGap", 10, { secondRowEnabled: false });
});

test("refusals are worded in the requested language", () => {
  const en = refused("clockTextSize", 500, ON, "en");
  const de = refused("clockTextSize", 500, ON, "de");
  assert.notEqual(en, de);
  assert.match(en, /5/);
  assert.match(de, /100/);
});
