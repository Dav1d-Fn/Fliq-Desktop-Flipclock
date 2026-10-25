// tuxhub live interface: answers the requests that src-tauri/src/tuxhub.rs forwards to the
// main window and reports changes of the settings, including those made in the styling window
// (they arrive here through the localStorage sync of atomWithStorage).
import { getDefaultStore, type WritableAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getAllWindows, getCurrentWindow } from "@tauri-apps/api/window";
import { enable, disable } from "@tauri-apps/plugin-autostart";
import { ATOMS } from "./pages/atoms";
import { schema, check, toLocale, Refusal, ACTION_IDS } from "./tuxhub-schema.ts";

type Request = { rid: number; conn: number; method: string; params: unknown };

type Setting = WritableAtom<any, [any], void>;

// Schema key -> atom. The keys are the localStorage keys of the atoms.
const SETTINGS: Record<string, Setting> = {
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
};

const store = getDefaultStore();

// Language of refusals: the one tuxhub last asked the schema in.
let locale = "en";

// The connection whose `set` is being applied right now. Jotai calls subscribers synchronously
// inside `store.set`, so the change is not echoed back to the connection that made it.
let origin: number | null = null;

const options = () => ({ secondRowEnabled: store.get(ATOMS.SECOND_ROW_ENABLED) as boolean });

async function overlayPreference(): Promise<string> {
  const s = await invoke<{ preference: string }>("get_overlay_state");
  return s.preference;
}

async function values() {
  const out: Record<string, unknown> = {};
  for (const [key, atom] of Object.entries(SETTINGS)) out[key] = store.get(atom);
  out.overlayMode = await overlayPreference();
  return out;
}

// Same side effects as the context menu entries in App.tsx.
async function apply(key: string, value: unknown, conn: number) {
  switch (key) {
    case "overlayMode":
      // Rust stores it and reports `changed` itself.
      await invoke("set_overlay_mode", { mode: value });
      return;
    case "autostart":
      await (value ? enable() : disable());
      break;
    case "hideInTaskbar":
      await getCurrentWindow().setSkipTaskbar(value as boolean);
      break;
    case "alwaysOnTop":
      await getCurrentWindow().setAlwaysOnTop(value as boolean);
      break;
  }
  origin = conn;
  try {
    store.set(SETTINGS[key], value);
  } finally {
    origin = null;
  }
}

const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

async function handle(req: Request): Promise<{ result: unknown; after?: () => void }> {
  const params = object(req.params);
  switch (req.method) {
    case "schema":
      locale = toLocale(params.locale);
      return { result: schema(locale, options()) };
    case "get":
      return { result: { values: await values() } };
    case "set": {
      const key = typeof params.key === "string" ? params.key : "";
      const value = check(key, params.value, options(), locale);
      await apply(key, value, req.conn);
      return { result: { value } };
    }
    case "action":
      switch (params.id) {
        case "open-styling":
          await invoke("open_stylingmenu_window");
          return { result: true };
        case "quit":
          // Like "Exit" in the context menu, after the answer is out.
          return {
            result: true,
            after: async () => (await getAllWindows()).forEach((w) => w.close()),
          };
      }
      throw new Error(`unknown action ${JSON.stringify(params.id)}, expected ${ACTION_IDS.join(" or ")}`);
  }
  throw new Error(`unknown method ${req.method}`);
}

/** Starts the interface; returns the cleanup. Without the Rust side (Windows, macOS) it stays idle. */
export function startTuxhub(): () => void {
  const cleanups: (() => void)[] = [];
  let stopped = false;
  const keep = (cleanup: () => void) => (stopped ? cleanup() : cleanups.push(cleanup));

  (async () => {
    const unlisten = await listen<Request>("tuxhub-request", async ({ payload: req }) => {
      let reply: { result?: unknown; error?: { message: string; field?: string } };
      let after: (() => void) | undefined;
      try {
        const r = await handle(req);
        reply = { result: r.result };
        after = r.after;
      } catch (e) {
        reply = e instanceof Refusal
          ? { error: { message: e.message, field: e.field } }
          : { error: { message: e instanceof Error ? e.message : String(e) } };
      }
      await invoke("tuxhub_respond", { rid: req.rid, ...reply }).catch(() => {});
      after?.();
    });
    keep(unlisten);

    // Only after the listener exists: the socket appears now, and tuxhub asks right away.
    try {
      await invoke("tuxhub_ready");
    } catch {
      return; // no live interface on this platform
    }
    if (stopped) return;

    for (const [key, atom] of Object.entries(SETTINGS)) {
      keep(
        store.sub(atom, () => {
          invoke("tuxhub_changed", { values: { [key]: store.get(atom) }, exclude: origin })
            .catch((err) => console.error("tuxhub_changed failed:", err));
          if (key === "secondRowEnabled") {
            invoke("tuxhub_schema_changed").catch((err) => console.error("tuxhub_schema_changed failed:", err));
          }
        }),
      );
    }
  })();

  return () => {
    stopped = true;
    cleanups.forEach((c) => c());
  };
}
