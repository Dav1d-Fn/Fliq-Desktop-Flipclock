// Runs with `npm test` (node --test, no extra dependency).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  schema,
  check,
  Refusal,
  FORMAT_PRESETS,
  SECOND_ROW_PRESETS,
  THEMES,
  COLOR_KEYS,
  presetOf,
  themeOf,
} from "../src/tuxhub-schema.ts";

const ON = { secondRowEnabled: true };
const OFF = { secondRowEnabled: false };

const fields = (s: ReturnType<typeof schema>) => s.sections.flatMap((sec) => sec.fields);
const field = (key: string, s = schema("en", ON)) => {
  const f = fields(s).find((f) => f.key === key);
  assert.ok(f, `field ${key} is missing`);
  return f;
};

// Initial values of the atoms in atoms.ts, as written there.
function atomDefaults(): Map<string, unknown> {
  const atoms = readFileSync(new URL("../src/pages/atoms.ts", import.meta.url), "utf8");
  return new Map(
    [...atoms.matchAll(/atomWithStorage(?:<[^>]*>)?\("([^"]+)", (.+?)\),/g)].map((m) => [m[1], JSON.parse(m[2])]),
  );
}
const CACHES = ["weatherData", "sunTimes"];

test("schema covers every stored setting except caches", () => {
  const keys = fields(schema("en", ON)).map((f) => f.key);
  for (const key of [...atomDefaults().keys()].filter((k) => !CACHES.includes(k))) {
    assert.ok(keys.includes(key), `${key} is not in the schema`);
  }
  for (const key of ["overlayMode", "formatPreset", "secondRowPreset"]) assert.ok(keys.includes(key));
});

test("settings are ordered in the tabs display, appearance, weather and behavior", () => {
  const s = schema("en", ON);
  assert.deepEqual(
    s.sections.map((sec) => [sec.id, sec.icon]),
    [["display", "clock"], ["appearance", "palette"], ["weather", "cloud-sun"], ["behavior", "settings"]],
  );
  const keysOf = (id: string) => s.sections.find((sec) => sec.id === id)!.fields.map((f) => f.key);
  assert.deepEqual(keysOf("display"), [
    "formatPreset", "format", "secondRowEnabled", "secondRowPreset", "secondRowFormat", "lang",
  ]);
  assert.deepEqual(keysOf("appearance"), [
    "theme", "textFont", "clockTextSize", "secondRowClockTextSize",
    "boxBackgroundColor", "flipCardBackground", "clockTextColor", "clockSeparatorColor", "textColor",
    "boxRounded", "flipcardRounded", "clockPadding", "secondRowGap", "seperatorString",
  ]);
  assert.deepEqual(keysOf("weather"), ["weatherLocation", "weatherUnit"]);
  assert.deepEqual(keysOf("behavior"), ["autostart", "alwaysOnTop", "hideInTaskbar", "overlayMode"]);
  assert.ok(s.sections.find((sec) => sec.id === "weather")!.description);
});

test("rare options are advanced", () => {
  const advanced = fields(schema("en", ON)).filter((f) => f.advanced).map((f) => f.key);
  assert.deepEqual(advanced, ["clockPadding", "secondRowGap", "seperatorString", "overlayMode"]);
});

test("every field has a default that is a valid value", () => {
  for (const f of fields(schema("en", ON))) {
    assert.ok("default" in f, `${f.key} has no default`);
    assert.deepEqual(check(f.key, f.default, ON), f.default, f.key);
  }
});

test("defaults are the initial values of the atoms", () => {
  for (const [key, initial] of atomDefaults()) {
    if (CACHES.includes(key)) continue;
    if (key === "theme") {
      // Not stored before 1.5: derived from the colors, which default to the dark theme.
      assert.equal(initial, null);
      assert.equal(field("theme").default, "dark");
      continue;
    }
    assert.deepEqual(field(key).default, initial, key);
  }
  assert.equal(field("overlayMode").default, "auto");
  assert.equal(field("formatPreset").default, "seconds");
  assert.equal(field("secondRowPreset").default, "date-weather");
  for (const key of COLOR_KEYS) assert.equal(THEMES.dark[key], field(key).default, key);
});

test("templates are offered in the order of the spec", () => {
  const values = (key: string) => field(key).options!.map((o) => o.value);
  assert.deepEqual(values("formatPreset"), ["seconds", "minutes", "12h", "custom"]);
  assert.deepEqual(values("secondRowPreset"), ["date", "date-weather", "weather", "custom"]);
  assert.deepEqual(values("theme"), ["dark", "light", "glass", "retro", "custom"]);
  for (const o of field("theme").options!) {
    if (o.value === "custom") assert.equal(o.colors, undefined);
    else assert.deepEqual(o.colors, [THEMES[o.value].boxBackgroundColor, THEMES[o.value].flipCardBackground, THEMES[o.value].clockTextColor]);
  }
});

test("the 12-hour template uses two-digit hours so the number of flip cards stays the same", () => {
  // FlipClock creates one card per character when the format changes; `h` would lose a card at 10:00.
  assert.match(FORMAT_PRESETS["12h"], /\$FLIPTIME\(hh:mm\)/);
  assert.doesNotMatch(FORMAT_PRESETS["12h"], /\bh\b/);
});

test("custom formats are only shown when chosen", () => {
  assert.deepEqual(field("format").visible_if, { key: "formatPreset", equals: "custom" });
  assert.deepEqual(field("secondRowPreset").visible_if, { key: "secondRowEnabled", equals: true });
  assert.deepEqual(field("secondRowClockTextSize").visible_if, { key: "secondRowEnabled", equals: true });
  // One condition only: with the second row off the custom format hides with it.
  assert.deepEqual(field("secondRowFormat", schema("en", ON)).visible_if, { key: "secondRowPreset", equals: "custom" });
  assert.deepEqual(field("secondRowFormat", schema("en", OFF)).visible_if, { key: "secondRowEnabled", equals: true });
});

test("schema stays within the limits tuxhub checks", () => {
  const color = /^#([0-9a-f]{6}|[0-9a-f]{8})$/;
  for (const locale of ["en", "de"]) {
    for (const opts of [ON, OFF]) {
      const s = schema(locale, opts);
      const ident = /^[A-Za-z0-9_.-]{1,64}$/;
      assert.ok(s.sections.length <= 32 && s.actions.length <= 32);
      const keys = new Set<string>();
      for (const sec of s.sections) {
        assert.match(sec.id, ident);
        assert.ok(sec.label.length > 0 && sec.label.length <= 120);
        assert.ok((sec.description ?? "").length <= 300);
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
            for (const o of f.options!) {
              assert.ok(o.label.length > 0 && o.label.length <= 120);
              assert.ok((o.description ?? "").length <= 200, `${f.key}.${o.value}`);
              assert.ok((o.colors ?? []).length <= 6);
              for (const c of o.colors ?? []) assert.match(c, color);
            }
          }
          if (f.type === "number") assert.ok(f.min! <= f.max!);
          if (f.type === "text") assert.ok(f.max_length! >= 1 && f.max_length! <= 65536);
        }
      }
      for (const f of fields(s)) {
        if (!f.visible_if) continue;
        assert.match(f.visible_if.key, ident);
        assert.ok(keys.has(f.visible_if.key), `${f.key} depends on an unknown key`);
      }
      for (const a of s.actions) {
        assert.match(a.id, ident);
        assert.ok(a.label.length > 0 && a.label.length <= 120);
        assert.ok((a.confirm ?? "").length <= 200);
      }
    }
  }
});

test("labels come in English and German, anything else falls back to English", () => {
  assert.equal(field("textColor", schema("en", ON)).label, "Other text");
  assert.equal(field("textColor", schema("de", ON)).label, "Übriger Text");
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
  const actions = schema("en", ON).actions;
  assert.deepEqual(actions.map((a) => a.id), ["open-styling", "reset"]);
  const reset = actions[1];
  assert.equal(reset.danger, true);
  assert.ok(reset.confirm && reset.confirm.length > 0);
  assert.equal(actions[0].danger, undefined);
});

test("second row fields follow the second row switch", () => {
  const second = ["secondRowGap", "secondRowClockTextSize", "secondRowFormat", "secondRowPreset"];
  for (const key of second) {
    assert.ok(!field(key, schema("en", ON)).disabled);
    assert.equal(field(key, schema("en", OFF)).disabled, true);
  }
  assert.ok(!field("secondRowEnabled", schema("en", OFF)).disabled);
});

// Randfall 14
test("a format equal to a template selects it, anything else is custom", () => {
  for (const [id, format] of Object.entries(FORMAT_PRESETS)) assert.equal(presetOf(format, FORMAT_PRESETS), id);
  for (const [id, format] of Object.entries(SECOND_ROW_PRESETS)) assert.equal(presetOf(format, SECOND_ROW_PRESETS), id);
  assert.equal(presetOf("$FLIPTIME(HH:mm:ss) ", FORMAT_PRESETS), "custom");
  assert.equal(presetOf("$flipTIME(HH:mm:ss)", FORMAT_PRESETS), "custom");
  assert.equal(presetOf("", FORMAT_PRESETS), "custom");
  assert.equal(presetOf(undefined, FORMAT_PRESETS), "custom");
  // Not inherited properties of plain objects.
  assert.equal(presetOf("[object Object]", FORMAT_PRESETS), "custom");
});

// Randfall 18 (pure part)
test("the theme follows the colors when none is stored", () => {
  for (const id of ["dark", "light", "glass", "retro"]) {
    assert.equal(themeOf(null, { ...THEMES[id] }), id);
  }
  assert.equal(themeOf(null, { ...THEMES.dark, textColor: "#ff0000ff" }), "custom");
  // Stored choice wins while the colors still fit it.
  assert.equal(themeOf("custom", { ...THEMES.dark }), "custom");
  assert.equal(themeOf("light", { ...THEMES.light }), "light");
  // A stored template whose colors were changed elsewhere is custom.
  assert.equal(themeOf("light", { ...THEMES.dark }), "custom");
  // Unknown stored values are ignored.
  assert.equal(themeOf("neon", { ...THEMES.retro }), "retro");
  // Colors compare like tuxhub does: #rrggbb is #rrggbbff, case does not matter.
  assert.equal(themeOf(null, { ...THEMES.light, flipCardBackground: "#FFFFFF" }), "light");
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
  assert.equal(check("formatPreset", "12h", ON), "12h");
  assert.equal(check("secondRowPreset", "custom", ON), "custom");
  assert.equal(check("theme", "glass", ON), "glass");
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
  refused("formatPreset", "$FLIPTIME(HH:mm)");
  refused("theme", "neon");
  refused("theme", null);
});

test("unknown keys and disabled fields are refused", () => {
  refused("weatherData", { temp: 1 });
  refused("__proto__", 1);
  refused("secondRowGap", 10, OFF);
  refused("secondRowPreset", "date", OFF);
});

test("refusals are worded in the requested language", () => {
  const en = refused("clockTextSize", 500, ON, "en");
  const de = refused("clockTextSize", 500, ON, "de");
  assert.notEqual(en, de);
  assert.match(en, /5/);
  assert.match(de, /100/);
});
