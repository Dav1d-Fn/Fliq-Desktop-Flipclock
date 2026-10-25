// The settings tuxhub sees, on top of the Jotai atoms: stored values, the derived templates
// (formatPreset, secondRowPreset, theme), reset and change reports. Changes made elsewhere (the
// styling window, through the localStorage sync of atomWithStorage) are reported the same way.
// Free of React and Tauri so `npm test` runs it against a real Jotai store.
import type { WritableAtom, createStore } from "jotai/vanilla";
import { RESET } from "jotai/utils";
import { ATOMS } from "./pages/atoms.ts";
import { FORMAT_PRESETS, SECOND_ROW_PRESETS, THEMES, COLOR_KEYS, presetOf, themeOf } from "./tuxhub-schema.ts";

type Store = ReturnType<typeof createStore>;
type Setting = WritableAtom<any, [any], void>;
type Values = Record<string, unknown>;

// Schema key -> atom. The keys are the localStorage keys of the atoms.
export const SETTINGS: Record<string, Setting> = {
  lang: ATOMS.LANGUAGE,
  boxBackgroundColor: ATOMS.BOX_BACKGROUND,
  boxRounded: ATOMS.BOX_RADIUS,
  clockPadding: ATOMS.CLOCK_PADDING,
  textFont: ATOMS.TEXT_FONT,
  textColor: ATOMS.TEXT_COLOR,
  clockTextSize: ATOMS.CLOCK_TEXT_SIZE,
  format: ATOMS.TIME_FORMAT,
  secondRowEnabled: ATOMS.SECOND_ROW_ENABLED,
  secondRowGap: ATOMS.SECOND_ROW_GAP,
  secondRowClockTextSize: ATOMS.SECOND_ROW_CLOCK_TEXT_SIZE,
  secondRowFormat: ATOMS.SECOND_ROW_TIME_FORMAT,
  clockSeparatorColor: ATOMS.CLOCK_SEPARATOR_COLOR,
  clockTextColor: ATOMS.CLOCK_TEXT_COLOR,
  flipCardBackground: ATOMS.FLIPCARD_BACKGROUND,
  flipcardRounded: ATOMS.FLIPCARD_RADIUS,
  seperatorString: ATOMS.SEPARATOR_STRING,
  weatherUnit: ATOMS.WEATHER_UNIT,
  weatherLocation: ATOMS.WEATHER_LOCATION,
  autostart: ATOMS.AUTOSTART,
  hideInTaskbar: ATOMS.HIDE_IN_TASKBAR,
  alwaysOnTop: ATOMS.ALWAYS_ON_TOP,
  theme: ATOMS.THEME,
};

// Template choice -> the format it writes.
const PRESETS: Record<string, { format: string; presets: Record<string, string> }> = {
  formatPreset: { format: "format", presets: FORMAT_PRESETS },
  secondRowPreset: { format: "secondRowFormat", presets: SECOND_ROW_PRESETS },
};

const isColor = (key: string) => (COLOR_KEYS as readonly string[]).includes(key);

export function createSettings(store: Store) {
  // "Custom format" chosen while the format still equals a template; kept until the format changes,
  // so the text field does not vanish on the next `get`.
  const custom = new Set<string>();
  const listeners = new Set<(values: Values) => void>();
  let unsubs: (() => void)[] = [];

  // Changes are collected and reported once per `set`, `reset` or outside change.
  let depth = 0;
  let pending = new Set<string>();
  // While a theme or the defaults are written, the colors do not make the theme custom.
  let quiet = false;

  const colors = () => Object.fromEntries(COLOR_KEYS.map((k) => [k, store.get(SETTINGS[k])]));

  function get(key: string): unknown {
    if (key === "theme") return themeOf(store.get(ATOMS.THEME), colors());
    const p = PRESETS[key];
    if (p) return custom.has(key) ? "custom" : presetOf(store.get(SETTINGS[p.format]), p.presets);
    return store.get(SETTINGS[key]);
  }

  const keys = [...Object.keys(SETTINGS), ...Object.keys(PRESETS)];

  function values(): Values {
    return Object.fromEntries(keys.map((k) => [k, get(k)]));
  }

  function batch(fn: () => void) {
    depth++;
    try {
      fn();
    } finally {
      depth--;
      if (depth === 0 && pending.size > 0) {
        const out = Object.fromEntries([...pending].map((k) => [k, get(k)]));
        pending = new Set();
        listeners.forEach((l) => l(out));
      }
    }
  }

  // An atom changed, here or in the styling window.
  function changed(key: string) {
    batch(() => {
      pending.add(key);
      if (isColor(key)) {
        if (!quiet && store.get(ATOMS.THEME) !== "custom") store.set(ATOMS.THEME, "custom");
        pending.add("theme");
      }
      for (const [preset, p] of Object.entries(PRESETS)) {
        if (p.format !== key) continue;
        custom.delete(preset);
        pending.add(preset);
      }
    });
  }

  /** Applies a value that `check` accepted. */
  function set(key: string, value: unknown) {
    batch(() => {
      const p = PRESETS[key];
      if (p) {
        if (value === "custom") {
          custom.add(key);
        } else {
          custom.delete(key);
          store.set(SETTINGS[p.format], p.presets[value as string]);
        }
        pending.add(key);
      } else if (key === "theme") {
        if (value !== "custom") {
          quiet = true;
          try {
            for (const k of COLOR_KEYS) store.set(SETTINGS[k], THEMES[value as string][k]);
          } finally {
            quiet = false;
          }
        }
        store.set(ATOMS.THEME, value as string);
        pending.add(key);
      } else {
        store.set(SETTINGS[key], value);
      }
    });
  }

  /** Every setting back to its default (removed from localStorage); reports all of them. */
  function reset() {
    batch(() => {
      quiet = true;
      try {
        for (const atom of Object.values(SETTINGS)) store.set(atom, RESET);
      } finally {
        quiet = false;
      }
      custom.clear();
      keys.forEach((k) => pending.add(k));
    });
  }

  /** Reports changed values to `report` until the returned function is called. */
  function watch(report: (values: Values) => void): () => void {
    listeners.add(report);
    if (listeners.size === 1) {
      unsubs = Object.entries(SETTINGS).map(([key, atom]) => store.sub(atom, () => changed(key)));
    }
    return () => {
      listeners.delete(report);
      if (listeners.size === 0) {
        unsubs.forEach((u) => u());
        unsubs = [];
      }
    };
  }

  return { values, set, reset, watch };
}
