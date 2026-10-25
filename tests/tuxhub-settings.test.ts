// Runs with `npm test`: the derived settings against a real Jotai store and a fake localStorage.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "jotai/vanilla";
import { RESET } from "jotai/utils";
import { createSettings } from "../src/tuxhub-settings.ts";
import { ATOMS } from "../src/pages/atoms.ts";
import { schema, FORMAT_PRESETS, SECOND_ROW_PRESETS, THEMES, COLOR_KEYS } from "../src/tuxhub-schema.ts";

// atomWithStorage reaches localStorage through `window`.
const storage = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  },
};

function setup(stored: Record<string, unknown> = {}) {
  storage.clear();
  for (const [k, v] of Object.entries(stored)) storage.set(k, JSON.stringify(v));
  const store = createStore();
  const settings = createSettings(store);
  const reports: Record<string, unknown>[] = [];
  settings.watch((values) => reports.push(values));
  const reported = () => Object.assign({}, ...reports);
  const clear = () => (reports.length = 0);
  return { store, settings, reports, reported, clear };
}

const DEFAULTS = Object.fromEntries(
  schema("en", { secondRowEnabled: true }).sections.flatMap((s) => s.fields).map((f) => [f.key, f.default]),
);

test("values hold the stored settings and the derived ones", () => {
  const { settings } = setup({ format: FORMAT_PRESETS.minutes, clockTextSize: 40 });
  const v = settings.values();
  assert.equal(v.format, FORMAT_PRESETS.minutes);
  assert.equal(v.formatPreset, "minutes");
  assert.equal(v.clockTextSize, 40);
  assert.equal(v.secondRowPreset, "date-weather");
  assert.equal(v.theme, "dark");
  assert.ok(!("overlayMode" in v), "overlayMode lives in Rust");
  assert.ok(!("weatherData" in v));
});

test("choosing a template writes its format and reports both", () => {
  const { settings, reported } = setup();
  settings.set("formatPreset", "12h");
  assert.equal(settings.values().format, FORMAT_PRESETS["12h"]);
  assert.equal(storage.get("format"), JSON.stringify(FORMAT_PRESETS["12h"]));
  assert.deepEqual(reported(), { format: FORMAT_PRESETS["12h"], formatPreset: "12h" });

  const second = setup();
  second.settings.set("secondRowPreset", "date");
  assert.equal(second.settings.values().secondRowFormat, SECOND_ROW_PRESETS.date);
  assert.deepEqual(second.reported(), { secondRowFormat: SECOND_ROW_PRESETS.date, secondRowPreset: "date" });
});

// Randfall 15
test("choosing the custom format keeps the format and stays until the format changes", () => {
  const { settings, reported, clear } = setup();
  settings.set("formatPreset", "custom");
  assert.equal(settings.values().format, FORMAT_PRESETS.seconds);
  assert.equal(storage.has("format"), false);
  assert.equal(settings.values().formatPreset, "custom");
  assert.deepEqual(reported(), { formatPreset: "custom" });

  // Typing a template by hand selects it again.
  clear();
  settings.set("format", FORMAT_PRESETS.minutes);
  assert.equal(settings.values().formatPreset, "minutes");
  assert.deepEqual(reported(), { format: FORMAT_PRESETS.minutes, formatPreset: "minutes" });

  // Back to a template while the format already matches it.
  settings.set("formatPreset", "custom");
  clear();
  settings.set("formatPreset", "minutes");
  assert.equal(settings.values().formatPreset, "minutes");
  assert.deepEqual(reported(), { formatPreset: "minutes" });
});

// Randfall 16
test("changing a single color makes the theme custom and reports both", () => {
  const { settings, reported } = setup();
  settings.set("clockTextColor", "#ff0000ff");
  assert.equal(settings.values().theme, "custom");
  assert.deepEqual(reported(), { clockTextColor: "#ff0000ff", theme: "custom" });
  assert.equal(storage.get("theme"), JSON.stringify("custom"));
});

// Randfall 17
test("choosing a theme sets all its colors and reports them", () => {
  const { settings, reported } = setup({ textColor: "#123456ff" });
  settings.set("theme", "light");
  const v = settings.values();
  for (const key of COLOR_KEYS) assert.equal(v[key], THEMES.light[key], key);
  assert.equal(v.theme, "light");
  assert.deepEqual(reported(), { ...THEMES.light, theme: "light" });
});

test("choosing the custom theme keeps the colors", () => {
  const { settings, reported } = setup();
  settings.set("theme", "custom");
  const v = settings.values();
  for (const key of COLOR_KEYS) assert.equal(v[key], THEMES.dark[key], key);
  assert.equal(v.theme, "custom");
  assert.deepEqual(reported(), { theme: "custom" });
});

// Randfall 18
test("after an update from 1.4 the theme is derived from the colors", () => {
  assert.equal(setup({ ...THEMES.retro }).settings.values().theme, "retro");
  assert.equal(setup({ ...THEMES.light, textColor: "#ff0000ff" }).settings.values().theme, "custom");
  assert.equal(setup({}).settings.values().theme, "dark");
  assert.equal(setup({ ...THEMES.retro, theme: "custom" }).settings.values().theme, "custom");
});

// Randfall 19
test("reset restores every default and reports every key", () => {
  const { store, settings, reported, clear } = setup({
    format: "$FLIPTIME(mm)",
    clockTextSize: 60,
    secondRowEnabled: false,
    weatherLocation: "Berlin",
    autostart: true,
    ...THEMES.retro,
    theme: "retro",
  });
  settings.set("formatPreset", "custom");
  clear();
  settings.reset();
  const v = settings.values();
  const keys = Object.keys(v);
  for (const key of keys) assert.deepEqual(v[key], DEFAULTS[key], key);
  assert.deepEqual(Object.keys(reported()).sort(), [...keys].sort());
  assert.deepEqual(reported(), v);
  // Defaults are not stored, so a later change of a default in Fliq applies.
  for (const key of keys) assert.equal(storage.has(key), false, key);
  assert.equal(store.get(ATOMS.THEME), null);
});

// Randfall 20
test("a format changed in the styling window reports the new preset", () => {
  const { store, settings, reported } = setup();
  // The styling window writes localStorage; the storage event sets the atom in this window.
  store.set(ATOMS.TIME_FORMAT, FORMAT_PRESETS.minutes);
  assert.deepEqual(reported(), { format: FORMAT_PRESETS.minutes, formatPreset: "minutes" });
  store.set(ATOMS.SECOND_ROW_TIME_FORMAT, "$TEXT(hi)");
  assert.equal(settings.values().secondRowPreset, "custom");
  assert.equal(reported().secondRowPreset, "custom");
});

test("a color changed in the styling window makes the theme custom", () => {
  const { store, settings, reported } = setup();
  store.set(ATOMS.BOX_BACKGROUND, "#000000ff");
  assert.equal(settings.values().theme, "custom");
  assert.deepEqual(reported(), { boxBackgroundColor: "#000000ff", theme: "custom" });
});

test("a removed setting falls back to its default", () => {
  const { store, settings } = setup({ format: FORMAT_PRESETS.minutes });
  store.set(ATOMS.TIME_FORMAT, RESET);
  assert.equal(settings.values().formatPreset, "seconds");
});

test("each change is reported once", () => {
  const { settings, reports } = setup();
  settings.set("theme", "glass");
  assert.equal(reports.length, 1);
  settings.set("clockTextSize", 30);
  assert.equal(reports.length, 2);
  assert.deepEqual(reports[1], { clockTextSize: 30 });
});

test("watching stops", () => {
  const { store, settings } = setup();
  const seen: unknown[] = [];
  const stop = settings.watch((v) => seen.push(v));
  stop();
  store.set(ATOMS.CLOCK_TEXT_SIZE, 30);
  assert.deepEqual(seen, []);
});
