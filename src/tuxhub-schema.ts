// Schema and value checks for the tuxhub live interface (protocol 1 with the optional 1.1 additions:
// tabs with icons, `advanced`, `visible_if`, option colors, `confirm`; older tuxhub ignores them).
// Kept free of React, Jotai and Tauri so `npm test` can run it with plain Node.
import { LOCALE_OPTIONS, FONT_OPTIONS, TEMPERATURE_UNIT_OPTIONS, SLIDER_CONFIGS } from "./definitions.ts";

type Locale = "en" | "de";
type Text = Record<Locale, string>;

export type Condition = { key: string; equals: unknown };
export type Options = { secondRowEnabled: boolean };

type Choice = { value: string; label: Text; description?: Text; colors?: string[] };

type Common = {
  key: string;
  label: Text;
  help?: Text;
  default: unknown;
  advanced?: boolean;
  visible_if?: Condition | ((opts: Options) => Condition);
};

type FieldDef = Common &
  (
    | { type: "toggle" }
    | { type: "number"; min: number; max: number; unit: string }
    | { type: "select"; options: Choice[] }
    | { type: "text"; placeholder?: Text; max_length: number; multiline?: boolean }
    | { type: "color" }
  );

export type Field = {
  key: string;
  type: FieldDef["type"];
  label: string;
  help?: string;
  default: unknown;
  advanced?: boolean;
  visible_if?: Condition;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  slider?: boolean;
  options?: { value: string; label: string; description?: string; colors?: string[] }[];
  placeholder?: string;
  max_length?: number;
  multiline?: boolean;
  alpha?: boolean;
};

export type Schema = {
  sections: { id: string; label: string; icon: string; description?: string; fields: Field[] }[];
  actions: { id: string; label: string; danger?: boolean; confirm?: string }[];
};

const same = (s: string): Text => ({ en: s, de: s });

/** Format templates; a stored format equal to one of them selects it. */
export const FORMAT_PRESETS: Record<string, string> = {
  seconds: "$FLIPTIME(HH:mm:ss)",
  minutes: "$FLIPTIME(HH:mm)",
  // Two-digit hours: FlipClock creates one card per character when the format changes.
  "12h": "$FLIPTIME(hh:mm) $TEXT( ) $TIME(A)",
};

export const SECOND_ROW_PRESETS: Record<string, string> = {
  date: "$TIME(dddd, DD.MM)",
  "date-weather": "$TIME(dddd, DD.MM) $TEXT( ) $WEATHER(feelsLikeEmoji) $TEXT( ) $WEATHER(nextSun)",
  weather: "$WEATHER(feelsLikeEmoji) $TEXT( ) $WEATHER(nextSun)",
};

export const COLOR_KEYS = [
  "boxBackgroundColor",
  "flipCardBackground",
  "clockTextColor",
  "clockSeparatorColor",
  "textColor",
] as const;

type Colors = Record<(typeof COLOR_KEYS)[number], string>;

/** Design templates. "dark" are the colors Fliq always had. Stored like the styling window does: #rrggbbaa. */
export const THEMES: Record<string, Colors> = {
  dark: {
    boxBackgroundColor: "#121212ab",
    flipCardBackground: "#171717ff",
    clockTextColor: "#fafafaff",
    clockSeparatorColor: "#fafafaff",
    textColor: "#fafafaff",
  },
  light: {
    boxBackgroundColor: "#f4f4f5e6",
    flipCardBackground: "#ffffffff",
    clockTextColor: "#18181bff",
    clockSeparatorColor: "#18181bff",
    textColor: "#27272aff",
  },
  glass: {
    boxBackgroundColor: "#ffffff1f",
    flipCardBackground: "#ffffff33",
    clockTextColor: "#ffffffff",
    clockSeparatorColor: "#ffffffff",
    textColor: "#ffffffff",
  },
  retro: {
    boxBackgroundColor: "#2b1a0ee6",
    flipCardBackground: "#3b2414ff",
    clockTextColor: "#ffb000ff",
    clockSeparatorColor: "#ffb000ff",
    textColor: "#f2d7a6ff",
  },
};

const own = (o: object, key: unknown): key is string => typeof key === "string" && Object.prototype.hasOwnProperty.call(o, key);

/** The template whose format is exactly `format`, otherwise "custom". */
export function presetOf(format: unknown, presets: Record<string, string>): string {
  return Object.keys(presets).find((id) => presets[id] === format) ?? "custom";
}

const sameColor = (a: unknown, b: string) =>
  typeof a === "string" && (a.length === 7 ? `${a}ff` : a).toLowerCase() === b;

const fits = (id: string, colors: Record<string, unknown>) =>
  COLOR_KEYS.every((k) => sameColor(colors[k], THEMES[id][k]));

/**
 * The theme to show: the stored one while the colors still fit it, "custom" if chosen;
 * without a stored theme (settings from 1.4) the template the colors match, otherwise "custom".
 */
export function themeOf(stored: unknown, colors: Record<string, unknown>): string {
  if (stored === "custom") return "custom";
  if (own(THEMES, stored)) return fits(stored, colors) ? stored : "custom";
  return Object.keys(THEMES).find((id) => fits(id, colors)) ?? "custom";
}

const FORMAT_HELP: Text = {
  en: "Placeholders: $FLIPTIME(HH:mm:ss), $TIME(dddd, DD.MM), $TEXT(…), $WEATHER(tempEmoji). Formats follow Day.js.",
  de: "Platzhalter: $FLIPTIME(HH:mm:ss), $TIME(dddd, DD.MM), $TEXT(…), $WEATHER(tempEmoji). Formate wie bei Day.js.",
};

const CUSTOM_FORMAT: Choice = {
  value: "custom",
  label: { en: "Custom format", de: "Eigenes Format" },
  description: { en: "Combine placeholders yourself.", de: "Platzhalter selbst zusammenstellen." },
};

const SECOND_ROW_ON: Condition = { key: "secondRowEnabled", equals: true };

const number = (key: string, label: Text, cfg: { min: number; max: number; unit: string }, dflt: number): FieldDef => ({
  key,
  type: "number",
  label,
  min: cfg.min,
  max: cfg.max,
  unit: cfg.unit,
  default: dflt,
});

const color = (key: keyof Colors, label: Text): FieldDef => ({ key, type: "color", label, default: THEMES.dark[key] });

const theme = (value: string, label: Text, description?: Text): Choice => ({
  value,
  label,
  description,
  colors: [THEMES[value].boxBackgroundColor, THEMES[value].flipCardBackground, THEMES[value].clockTextColor],
});

// Defaults are the initial values in pages/atoms.ts (checked by the tests).
const SECTIONS: { id: string; label: Text; icon: string; description?: Text; fields: FieldDef[] }[] = [
  {
    id: "display",
    label: { en: "Display", de: "Anzeige" },
    icon: "clock",
    fields: [
      {
        key: "formatPreset",
        type: "select",
        label: { en: "Time", de: "Uhrzeit" },
        default: "seconds",
        options: [
          { value: "seconds", label: { en: "With seconds", de: "Mit Sekunden" }, description: same("13:37:42") },
          { value: "minutes", label: { en: "Without seconds", de: "Ohne Sekunden" }, description: same("13:37") },
          { value: "12h", label: { en: "12-hour clock", de: "12-Stunden-Format" }, description: same("01:37 PM") },
          CUSTOM_FORMAT,
        ],
      },
      {
        key: "format",
        type: "text",
        label: { en: "Custom format", de: "Eigenes Format" },
        help: FORMAT_HELP,
        default: FORMAT_PRESETS.seconds,
        max_length: 1000,
        multiline: true,
        visible_if: { key: "formatPreset", equals: "custom" },
      },
      {
        key: "secondRowEnabled",
        type: "toggle",
        label: { en: "Second row", de: "Zweite Zeile" },
        default: true,
      },
      {
        key: "secondRowPreset",
        type: "select",
        label: { en: "Second row shows", de: "Zweite Zeile zeigt" },
        default: "date-weather",
        visible_if: SECOND_ROW_ON,
        options: [
          { value: "date", label: { en: "Date", de: "Datum" } },
          { value: "date-weather", label: { en: "Date and weather", de: "Datum und Wetter" } },
          { value: "weather", label: { en: "Weather only", de: "Nur Wetter" } },
          CUSTOM_FORMAT,
        ],
      },
      {
        key: "secondRowFormat",
        type: "text",
        label: { en: "Custom format of the second row", de: "Eigenes Format der zweiten Zeile" },
        help: FORMAT_HELP,
        default: SECOND_ROW_PRESETS["date-weather"],
        max_length: 1000,
        multiline: true,
        // One condition only: with the second row off this hides along with the preset.
        visible_if: (opts) => (opts.secondRowEnabled ? { key: "secondRowPreset", equals: "custom" } : SECOND_ROW_ON),
      },
      {
        key: "lang",
        type: "select",
        label: { en: "Language of date and weather", de: "Sprache von Datum und Wetter" },
        default: "en",
        options: LOCALE_OPTIONS.map((l) => ({ value: l.code, label: same(l.name) })),
      },
    ],
  },
  {
    id: "appearance",
    label: { en: "Appearance", de: "Aussehen" },
    icon: "palette",
    fields: [
      {
        key: "theme",
        type: "select",
        label: { en: "Design", de: "Design" },
        help: {
          en: "A design sets all colors. Changing a single color switches to a custom design.",
          de: "Ein Design setzt alle Farben. Wer eine einzelne Farbe ändert, hat ein eigenes Design.",
        },
        default: "dark",
        options: [
          theme("dark", { en: "Dark", de: "Dunkel" }),
          theme("light", { en: "Light", de: "Hell" }),
          theme("glass", { en: "Glass", de: "Glas" }, { en: "Transparent", de: "Transparent" }),
          theme("retro", same("Retro")),
          {
            value: "custom",
            label: { en: "Custom design", de: "Eigenes Design" },
            description: { en: "Choose each color yourself.", de: "Jede Farbe selbst wählen." },
          },
        ],
      },
      {
        key: "textFont",
        type: "select",
        label: { en: "Font", de: "Schriftart" },
        default: "Arial, sans-serif",
        options: FONT_OPTIONS.map((f) => ({ value: f.value, label: same(f.label) })),
      },
      number("clockTextSize", { en: "Size of the time", de: "Größe der Uhrzeit" }, SLIDER_CONFIGS.TEXT_SIZE, 26),
      {
        ...number("secondRowClockTextSize", { en: "Size of the second row", de: "Größe der zweiten Zeile" }, SLIDER_CONFIGS.TEXT_SIZE, 12),
        visible_if: SECOND_ROW_ON,
      },
      color("boxBackgroundColor", { en: "Background", de: "Hintergrund" }),
      color("flipCardBackground", { en: "Flip cards", de: "Klappkarten" }),
      color("clockTextColor", { en: "Digits", de: "Ziffern" }),
      color("clockSeparatorColor", { en: "Separators", de: "Trennzeichen" }),
      color("textColor", { en: "Other text", de: "Übriger Text" }),
      number("boxRounded", { en: "Background rounding", de: "Rundung des Hintergrunds" }, SLIDER_CONFIGS.RADIUS, 30),
      number("flipcardRounded", { en: "Flip card rounding", de: "Rundung der Klappkarten" }, SLIDER_CONFIGS.RADIUS, 70),
      { ...number("clockPadding", { en: "Padding", de: "Innenabstand" }, SLIDER_CONFIGS.PADDING, 17), advanced: true },
      {
        ...number("secondRowGap", { en: "Gap above the second row", de: "Abstand zur zweiten Zeile" }, SLIDER_CONFIGS.PADDING, 9),
        advanced: true,
        visible_if: SECOND_ROW_ON,
      },
      {
        key: "seperatorString",
        type: "text",
        label: { en: "Characters without a flip card", de: "Zeichen ohne Klappkarte" },
        help: {
          en: "Characters shown between the flip cards instead of a card of their own.",
          de: "Zeichen, die zwischen den Klappkarten stehen statt auf einer eigenen Karte.",
        },
        default: " /\\,.:",
        max_length: 50,
        advanced: true,
      },
    ],
  },
  {
    id: "weather",
    label: { en: "Weather", de: "Wetter" },
    icon: "cloud-sun",
    description: {
      en: "Applies to the weather shown on the clock.",
      de: "Gilt für die Wetterangaben in der Anzeige.",
    },
    fields: [
      {
        key: "weatherLocation",
        type: "text",
        label: { en: "Location", de: "Ort" },
        placeholder: { en: "Empty: detected automatically", de: "Leer: automatisch erkannt" },
        default: "",
        max_length: 200,
      },
      {
        key: "weatherUnit",
        type: "select",
        label: { en: "Unit", de: "Einheit" },
        default: "C",
        options: TEMPERATURE_UNIT_OPTIONS.map((u) => ({ value: u.value, label: same(u.label) })),
      },
    ],
  },
  {
    id: "behavior",
    label: { en: "Behavior", de: "Verhalten" },
    icon: "settings",
    fields: [
      { key: "autostart", type: "toggle", label: { en: "Start with the computer", de: "Mit dem PC starten" }, default: false },
      { key: "alwaysOnTop", type: "toggle", label: { en: "Always on top", de: "Immer im Vordergrund" }, default: true },
      { key: "hideInTaskbar", type: "toggle", label: { en: "Hide in taskbar", de: "In der Taskleiste verstecken" }, default: true },
      {
        key: "overlayMode",
        type: "select",
        label: { en: "Overlay mode (Linux)", de: "Overlay-Modus (Linux)" },
        help: { en: "Takes effect after Fliq restarts.", de: "Wirkt nach einem Neustart von Fliq." },
        default: "auto",
        advanced: true,
        options: [
          {
            value: "auto",
            label: { en: "Automatic (recommended)", de: "Automatisch (empfohlen)" },
            description: { en: "Layer-Shell where possible, otherwise X11.", de: "Layer-Shell, wo möglich, sonst X11." },
          },
          {
            value: "layer-shell",
            label: same("Layer-Shell"),
            description: {
              en: "Stays above fullscreen windows. Needs KDE, Sway or Hyprland.",
              de: "Bleibt über Vollbildfenstern. Braucht KDE, Sway oder Hyprland.",
            },
          },
          {
            value: "x11",
            label: { en: "X11 compatibility", de: "X11-Kompatibilität" },
            description: { en: "Works everywhere.", de: "Läuft überall." },
          },
        ],
      },
    ],
  },
];

const SECOND_ROW = ["secondRowGap", "secondRowClockTextSize", "secondRowFormat", "secondRowPreset"];

const ACTIONS: { id: string; label: Text; danger?: boolean; confirm?: Text }[] = [
  { id: "open-styling", label: { en: "Open Fliq's own window", de: "Fliqs eigenes Fenster öffnen" } },
  {
    id: "reset",
    label: { en: "Reset all settings", de: "Alle Einstellungen zurücksetzen" },
    danger: true,
    confirm: {
      en: "All of Fliq's settings go back to their defaults. This cannot be undone.",
      de: "Alle Einstellungen von Fliq gehen auf die Standardwerte zurück. Das lässt sich nicht rückgängig machen.",
    },
  },
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
  const f: Field = { key: def.key, type: def.type, label: def.label[lang], default: def.default };
  if (def.help) f.help = def.help[lang];
  if (def.advanced) f.advanced = true;
  if (def.visible_if) f.visible_if = typeof def.visible_if === "function" ? def.visible_if(opts) : def.visible_if;
  if (isDisabled(def.key, opts)) f.disabled = true;
  switch (def.type) {
    case "number":
      Object.assign(f, { min: def.min, max: def.max, step: 1, unit: def.unit, slider: true });
      break;
    case "select":
      f.options = def.options.map((o) => ({
        value: o.value,
        label: o.label[lang],
        ...(o.description && { description: o.description[lang] }),
        ...(o.colors && { colors: o.colors }),
      }));
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
      icon: s.icon,
      ...(s.description && { description: s.description[lang] }),
      fields: s.fields.map((f) => render(f, lang, opts)),
    })),
    actions: ACTIONS.map((a) => ({
      id: a.id,
      label: a.label[lang],
      ...(a.danger && { danger: true }),
      ...(a.confirm && { confirm: a.confirm[lang] }),
    })),
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
