// tuxhub live interface: answers the requests that src-tauri/src/tuxhub.rs forwards to the
// main window and reports changes of the settings, including those made in the styling window
// (they arrive here through the localStorage sync of atomWithStorage).
import { getDefaultStore } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { enable, disable } from "@tauri-apps/plugin-autostart";
import { ATOMS } from "./pages/atoms";
import { schema, check, toLocale, Refusal, ACTION_IDS } from "./tuxhub-schema.ts";
import { createSettings } from "./tuxhub-settings.ts";

type Request = { rid: number; conn: number; method: string; params: unknown };

const store = getDefaultStore();
const settings = createSettings(store);

// Language of refusals: the one tuxhub last asked the schema in.
let locale = "en";

// The `set` being applied right now. Jotai calls subscribers synchronously inside `store.set`,
// so its own value is not echoed back to the connection that sent it; values derived from it
// (a template's format, the theme after a color) still are.
let origin: { conn: number; key: string } | null = null;

const options = () => ({ secondRowEnabled: store.get(ATOMS.SECOND_ROW_ENABLED) as boolean });

function report(values: Record<string, unknown>) {
  const send = (values: Record<string, unknown>, exclude: number | null) =>
    Object.keys(values).length > 0 &&
    invoke("tuxhub_changed", { values, exclude }).catch((err) => console.error("tuxhub_changed failed:", err));
  if (origin && origin.key in values) {
    const { [origin.key]: own, ...rest } = values;
    send({ [origin.key]: own }, origin.conn);
    send(rest, null);
  } else {
    send(values, null);
  }
  if ("secondRowEnabled" in values) {
    invoke("tuxhub_schema_changed").catch((err) => console.error("tuxhub_schema_changed failed:", err));
  }
}

async function overlayPreference(): Promise<string> {
  const s = await invoke<{ preference: string }>("get_overlay_state");
  return s.preference;
}

async function values() {
  return { ...settings.values(), overlayMode: await overlayPreference() };
}

// Same side effects as the context menu entries in App.tsx.
async function effect(key: string, value: unknown) {
  switch (key) {
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
}

async function apply(key: string, value: unknown, conn: number) {
  if (key === "overlayMode") {
    // Rust stores it and reports `changed` itself.
    await invoke("set_overlay_mode", { mode: value });
    return;
  }
  await effect(key, value);
  origin = { conn, key };
  try {
    settings.set(key, value);
  } finally {
    origin = null;
  }
}

async function reset() {
  settings.reset();
  const v = settings.values();
  for (const key of ["autostart", "hideInTaskbar", "alwaysOnTop"]) await effect(key, v[key]);
  await invoke("set_overlay_mode", { mode: "auto" });
}

const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

async function handle(req: Request): Promise<unknown> {
  const params = object(req.params);
  switch (req.method) {
    case "schema":
      locale = toLocale(params.locale);
      return schema(locale, options());
    case "get":
      return { values: await values() };
    case "set": {
      const key = typeof params.key === "string" ? params.key : "";
      const value = check(key, params.value, options(), locale);
      await apply(key, value, req.conn);
      return { value };
    }
    case "action":
      switch (params.id) {
        case "open-styling":
          await invoke("open_stylingmenu_window");
          return true;
        case "reset":
          await reset();
          return true;
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
      try {
        reply = { result: await handle(req) };
      } catch (e) {
        reply = e instanceof Refusal
          ? { error: { message: e.message, field: e.field } }
          : { error: { message: e instanceof Error ? e.message : String(e) } };
      }
      await invoke("tuxhub_respond", { rid: req.rid, ...reply }).catch(() => {});
    });
    keep(unlisten);

    // Only after the listener exists: the socket appears now, and tuxhub asks right away.
    try {
      await invoke("tuxhub_ready");
    } catch {
      return; // no live interface on this platform
    }
    if (stopped) return;

    keep(settings.watch(report));
  })();

  return () => {
    stopped = true;
    cleanups.forEach((c) => c());
  };
}
