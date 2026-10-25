// Schema and value checks for the tuxhub live interface (protocol 1).
// Kept free of React, Jotai and Tauri so `npm test` can run it with plain Node.
import { LOCALE_OPTIONS, FONT_OPTIONS, TEMPERATURE_UNIT_OPTIONS, SLIDER_CONFIGS } from "./definitions.ts";

type Locale = "en" | "de";
type Text = Record<Locale, string>;

type FieldDef =
  | { key: string; type: "toggle"; label: Text; help?: Text }
  | { key: string; type: "number"; label: Text; help?: Text; min: number; max: number; unit: string }
  | { key: string; type: "select"; label: Text; help?: Text; options: { value: string; label: Text }[] }
  | { key: string; type: "text"; label: Text; help?: Text; placeholder?: Text; max_length: number; multiline?: boolean }
  | { key: string; type: "color"; label: Text; help?: Text };

export type Field = {
  key: string;
  type: FieldDef["type"];
  label: string;
  help?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  slider?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  max_length?: number;
  multiline?: boolean;
  alpha?: boolean;
};

export type Schema = {
  sections: { id: string; label: string; fields: Field[] }[];
  actions: { id: string; label: string }[];
};

export type Options = { secondRowEnabled: boolean };

const same = (s: string): Text => ({ en: s, de: s });

const FORMAT_HELP: Text = {
  en: "Placeholders: $FLIPTIME(HH:mm:ss), $TIME(dddd, DD.MM), $TEXT(…), $WEATHER(tempEmoji). Formats follow Day.js.",
  de: "Platzhalter: $FLIPTIME(HH:mm:ss), $TIME(dddd, DD.MM), $TEXT(…), $WEATHER(tempEmoji). Formate wie bei Day.js.",
};

const number = (key: string, label: Text, cfg: { min: number; max: number; unit: string }): FieldDef => ({
  key,
  type: "number",
  label,
  min: cfg.min,
  max: cfg.max,
  unit: cfg.unit,
});

// Same order and grouping as the styling window, then the context menu.
const SECTIONS: { id: string; label: Text; fields: FieldDef[] }[] = [
  {
    id: "general",
    label: { en: "General", de: "Allgemein" },
    fields: [
      {
        key: "lang",
        type: "select",
        label: { en: "Language", de: "Sprache" },
        help: { en: "Language of dates and weather.", de: "Sprache von Datum und Wetter." },
        options: LOCALE_OPTIONS.map((l) => ({ value: l.code, label: same(l.name) })),
      },
      { key: "boxBackgroundColor", type: "color", label: { en: "Background color", de: "Hintergrundfarbe" } },
      number("boxRounded", { en: "Background rounding", de: "Rundung des Hintergrunds" }, SLIDER_CONFIGS.RADIUS),
      number("clockPadding", { en: "Padding", de: "Innenabstand" }, SLIDER_CONFIGS.PADDING),
      {
        key: "textFont",
        type: "select",
        label: { en: "Text font", de: "Schriftart" },
        options: FONT_OPTIONS.map((f) => ({ value: f.value, label: same(f.label) })),
      },
      { key: "textColor", type: "color", label: { en: "Text color", de: "Textfarbe" } },
      {
        key: "overlayMode",
        type: "select",
        label: { en: "Overlay mode (Linux)", de: "Overlay-Modus (Linux)" },
        help: {
          en: "Layer-Shell stays above fullscreen windows but needs KDE, Sway or Hyprland. X11 Compatibility works everywhere. Takes effect after a restart.",
          de: "Layer-Shell bleibt über Vollbildfenstern, braucht aber KDE, Sway oder Hyprland. X11-Kompatibilität läuft überall. Wirkt nach einem Neustart.",
        },
        options: [
          { value: "auto", label: { en: "Auto (recommended)", de: "Automatisch (empfohlen)" } },
          { value: "layer-shell", label: same("Layer-Shell") },
          { value: "x11", label: { en: "X11 Compatibility", de: "X11-Kompatibilität" } },
        ],
      },
    ],
  },
  {
    id: "first-line",
    label: { en: "First line", de: "Erste Zeile" },
    fields: [
      number("clockTextSize", { en: "Size", de: "Größe" }, SLIDER_CONFIGS.TEXT_SIZE),
      {
        key: "format",
        type: "text",
        label: { en: "Display format", de: "Anzeigeformat" },
        help: FORMAT_HELP,
        max_length: 1000,
        multiline: true,
      },
    ],
  },
  {
    id: "second-line",
    label: { en: "Second line", de: "Zweite Zeile" },
    fields: [
      { key: "secondRowEnabled", type: "toggle", label: { en: "Enable second row", de: "Zweite Zeile anzeigen" } },
      number("secondRowGap", { en: "Gap size", de: "Abstand" }, SLIDER_CONFIGS.PADDING),
      number("secondRowClockTextSize", { en: "Size", de: "Größe" }, SLIDER_CONFIGS.TEXT_SIZE),
      {
        key: "secondRowFormat",
        type: "text",
        label: { en: "Display format", de: "Anzeigeformat" },
        help: FORMAT_HELP,
        max_length: 1000,
        multiline: true,
      },
    ],
  },
  {
    id: "fliptime",
    label: { en: "$FLIPTIME settings", de: "$FLIPTIME-Einstellungen" },
    fields: [
      { key: "clockSeparatorColor", type: "color", label: { en: "Separator color", de: "Farbe der Trennzeichen" } },
      { key: "clockTextColor", type: "color", label: { en: "Text color", de: "Textfarbe" } },
      { key: "flipCardBackground", type: "color", label: { en: "Flip card background", de: "Hintergrund der Klappkarten" } },
      number("flipcardRounded", { en: "Rounding", de: "Rundung" }, SLIDER_CONFIGS.RADIUS),
      {
        key: "seperatorString",
        type: "text",
        label: { en: "Separator characters", de: "Trennzeichen" },
        help: {
          en: "Characters shown between the flip cards instead of a card of their own.",
          de: "Zeichen, die zwischen den Klappkarten stehen statt auf einer eigenen Karte.",
        },
        max_length: 50,
      },
    ],
  },
  {
    id: "weather",
    label: { en: "$WEATHER settings", de: "$WEATHER-Einstellungen" },
    fields: [
      {
        key: "weatherUnit",
        type: "select",
        label: { en: "Weather unit", de: "Temperatureinheit" },
        options: TEMPERATURE_UNIT_OPTIONS.map((u) => ({ value: u.value, label: same(u.label) })),
      },
      {
        key: "weatherLocation",
        type: "text",
        label: { en: "Location", de: "Ort" },
        placeholder: { en: "Leave empty for automatic detection.", de: "Leer lassen für automatische Erkennung." },
        max_length: 200,
      },
    ],
  },
  {
    id: "window",
    label: { en: "Window", de: "Fenster" },
    fields: [
      { key: "autostart", type: "toggle", label: { en: "Autostart", de: "Mit dem PC starten" } },
      { key: "hideInTaskbar", type: "toggle", label: { en: "Hide in taskbar", de: "In der Taskleiste verstecken" } },
      { key: "alwaysOnTop", type: "toggle", label: { en: "Always on top", de: "Immer im Vordergrund" } },
    ],
  },
];

const SECOND_ROW = ["secondRowGap", "secondRowClockTextSize", "secondRowFormat"];

const ACTIONS: { id: string; label: Text }[] = [
  { id: "open-styling", label: { en: "Open styling window", de: "Styling-Fenster öffnen" } },
  { id: "quit", label: { en: "Quit Fliq", de: "Fliq beenden" } },
];

const DEFS = new Map(SECTIONS.flatMap((s) => s.fields).map((f) => [f.key, f]));

export const KEYS: string[] = [...DEFS.keys()];

export function toLocale(locale: unknown): Locale {
  return typeof locale === "string" && locale.toLowerCase().startsWith("de") ? "de" : "en";
}

function isDisabled(key: string, opts: Options) {
  return !opts.secondRowEnabled && SECOND_ROW.includes(key);
}

function render(def: FieldDef, lang: Locale, opts: Options): Field {
  const f: Field = { key: def.key, type: def.type, label: def.label[lang] };
  if (def.help) f.help = def.help[lang];
  if (isDisabled(def.key, opts)) f.disabled = true;
  switch (def.type) {
    case "number":
      Object.assign(f, { min: def.min, max: def.max, step: 1, unit: def.unit, slider: true });
      break;
    case "select":
      f.options = def.options.map((o) => ({ value: o.value, label: o.label[lang] }));
      break;
    case "text":
      f.max_length = def.max_length;
      if (def.placeholder) f.placeholder = def.placeholder[lang];
      if (def.multiline) f.multiline = true;
      break;
    case "color":
      f.alpha = true;
      break;
  }
  return f;
}

export function schema(locale: unknown, opts: Options): Schema {
  const lang = toLocale(locale);
  return {
    sections: SECTIONS.map((s) => ({
      id: s.id,
      label: s.label[lang],
      fields: s.fields.map((f) => render(f, lang, opts)),
    })),
    actions: ACTIONS.map((a) => ({ id: a.id, label: a.label[lang] })),
  };
}

export const ACTION_IDS = ACTIONS.map((a) => a.id);

/** A refused `set`; tuxhub shows the message at the field. */
export class Refusal extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(message);
    this.field = field;
  }
}

const MESSAGES = {
  unknown: { en: "Fliq has no setting with this name.", de: "Diese Einstellung gibt es in Fliq nicht." },
  disabled: { en: "Enable the second row first.", de: "Zuerst die zweite Zeile einschalten." },
  toggle: { en: "Expected on or off.", de: "Erwartet ein oder aus." },
  number: { en: "Expected a number.", de: "Erwartet eine Zahl." },
  range: { en: "Choose a value from {min} to {max}.", de: "Wähle einen Wert von {min} bis {max}." },
  option: { en: "This option does not exist.", de: "Diese Auswahl gibt es nicht." },
  text: { en: "Expected text.", de: "Erwartet Text." },
  length: { en: "At most {max} characters.", de: "Höchstens {max} Zeichen." },
  color: { en: "Expected a color like #rrggbbaa.", de: "Erwartet eine Farbe wie #rrggbbaa." },
};

/**
 * Checks a value for `set` and returns it as Fliq stores it: numbers rounded to whole steps,
 * colors in lower case with alpha (the styling window uses the "hexa" format).
 */
export function check(key: string, value: unknown, opts: Options, locale: unknown = "en"): unknown {
  const lang = toLocale(locale);
  const refuse = (m: keyof typeof MESSAGES, vars: Record<string, number> = {}) =>
    new Refusal(key, MESSAGES[m][lang].replace(/\{(\w+)\}/g, (_, v) => String(vars[v])));
  const def = DEFS.get(key);
  if (!def) throw refuse("unknown");
  if (isDisabled(key, opts)) throw refuse("disabled");
  switch (def.type) {
    case "toggle":
      if (typeof value !== "boolean") throw refuse("toggle");
      return value;
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) throw refuse("number");
      const n = Math.round(value);
      if (n < def.min || n > def.max) throw refuse("range", { min: def.min, max: def.max });
      return n;
    }
    case "select":
      if (typeof value !== "string" || !def.options.some((o) => o.value === value)) throw refuse("option");
      return value;
    case "text":
      if (typeof value !== "string") throw refuse("text");
      if ([...value].length > def.max_length) throw refuse("length", { max: def.max_length });
      return value;
    case "color":
      if (typeof value !== "string" || !/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) throw refuse("color");
      return value.length === 7 ? `${value.toLowerCase()}ff` : value.toLowerCase();
  }
}
