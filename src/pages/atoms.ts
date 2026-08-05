import { atomWithStorage, createJSONStorage } from "jotai/utils";

const SETTINGS_STORAGE_APPLIED = "fliq-settings-storage-applied";

const baseStorage = createJSONStorage(() => localStorage);
const settingsSyncChannel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("fliq-settings-sync")
    : null;

function dispatchStoragePatched(key: string) {
  window.dispatchEvent(
    new CustomEvent<{ key: string }>(SETTINGS_STORAGE_APPLIED, { detail: { key } })
  );
}

function readRawFromLocalStorage(key: string): string | null {
  return window.localStorage.getItem(key);
}

async function emitTauriStoragePatch(key: string, raw: string | null) {
  try {
    const { emit } = await import("@tauri-apps/api/event");
    await emit("fliq-settings-storage", { key, raw });
  } catch {
    /* Vite im Browser oder Tauri nicht verfügbar */
  }
}

/** Tauri: jedes Webview hat oft eigenes localStorage — Events spiegeln den Wert in alle Webviews. */
function initTauriCrossWindowStorageMirror() {
  if (typeof window === "undefined") return;
  const w = window as Window & { __fliqTauriStorageMirror?: boolean };
  if (w.__fliqTauriStorageMirror) return;
  w.__fliqTauriStorageMirror = true;

  void import("@tauri-apps/api/event")
    .then(({ listen }) =>
      listen<{ key: string; raw: string | null }>("fliq-settings-storage", (e) => {
        const { key, raw } = e.payload;
        if (!key) return;
        const cur = readRawFromLocalStorage(key);
        if (raw === null) {
          if (cur === null) return;
          window.localStorage.removeItem(key);
        } else {
          if (cur === raw) return;
          window.localStorage.setItem(key, raw);
        }
        dispatchStoragePatched(key);
      })
    )
    .catch(() => {
      w.__fliqTauriStorageMirror = false;
    });
}

if (typeof window !== "undefined") {
  initTauriCrossWindowStorageMirror();
}

function atomWithSharedStorage<T>(key: string, initialValue: T) {
  const storage = baseStorage as {
    getItem: (storageKey: string, fallback: T) => T;
    setItem: (storageKey: string, value: T) => void;
    removeItem: (storageKey: string) => void;
    subscribe?: (
      storageKey: string,
      callback: (value: T) => void,
      fallback: T
    ) => () => void;
  };

  return atomWithStorage<T>(
    key,
    initialValue,
    {
      getItem: (storageKey, fallback) => storage.getItem(storageKey, fallback),
      setItem: (storageKey, value) => {
        storage.setItem(storageKey, value);
        const raw = readRawFromLocalStorage(storageKey);
        settingsSyncChannel?.postMessage({ key: storageKey, raw });
        void emitTauriStoragePatch(storageKey, raw);
      },
      removeItem: (storageKey) => {
        storage.removeItem(storageKey);
        settingsSyncChannel?.postMessage({ key: storageKey, raw: null });
        void emitTauriStoragePatch(storageKey, null);
      },
      subscribe: (storageKey, callback, fallback) => {
        const unsubscribeBase =
          storage.subscribe?.(storageKey, callback, fallback) ?? (() => {});

        let lastValue = storage.getItem(storageKey, fallback);

        const onStorageApplied = (event: Event) => {
          const ce = event as CustomEvent<{ key?: string }>;
          if (ce.detail?.key !== storageKey) return;
          const nextValue = storage.getItem(storageKey, fallback);
          if (JSON.stringify(nextValue) === JSON.stringify(lastValue)) return;
          lastValue = nextValue;
          callback(nextValue);
        };

        window.addEventListener(SETTINGS_STORAGE_APPLIED, onStorageApplied);

        const applyRawFromPeer = (raw: string | null) => {
          const cur = readRawFromLocalStorage(storageKey);
          if (raw === null) {
            if (cur === null) return;
            window.localStorage.removeItem(storageKey);
          } else {
            if (cur === raw) return;
            window.localStorage.setItem(storageKey, raw);
          }
          dispatchStoragePatched(storageKey);
        };

        const onBroadcast = (event: MessageEvent<{ key?: string; raw?: string | null }>) => {
          if (event.data?.key !== storageKey) return;
          applyRawFromPeer(event.data.raw ?? null);
        };

        settingsSyncChannel?.addEventListener("message", onBroadcast);

        return () => {
          unsubscribeBase();
          window.removeEventListener(SETTINGS_STORAGE_APPLIED, onStorageApplied);
          settingsSyncChannel?.removeEventListener("message", onBroadcast);
        };
      },
    },
    { getOnInit: true }
  );
}

export const ATOMS = {
  LANGUAGE: atomWithSharedStorage("lang", "en"),
  AUTOSTART: atomWithSharedStorage("autostart", false),
  HIDE_IN_TASKBAR: atomWithSharedStorage("hideInTaskbar", true),
  ALWAYS_ON_TOP: atomWithSharedStorage("alwaysOnTop", true),
  TEXT_FONT: atomWithSharedStorage("textFont", "Arial, sans-serif"),
  TEXT_COLOR: atomWithSharedStorage("textColor", "#fafafaff"),
  TIME_FORMAT: atomWithSharedStorage("format", "$FLIPTIME(HH:mm:ss)"),
  SEPARATOR_STRING: atomWithSharedStorage("seperatorString", " /\\,.:"),
  CLOCK_PADDING: atomWithSharedStorage("clockPadding", 17), // Padding in px
  CLOCK_TEXT_COLOR: atomWithSharedStorage("clockTextColor", "#fafafaff"),
  CLOCK_TEXT_SIZE: atomWithSharedStorage("clockTextSize", 26), // Text Size in px
  CLOCK_SEPARATOR_COLOR: atomWithSharedStorage("clockSeparatorColor", "#fafafaff"),
  FLIPCARD_BACKGROUND: atomWithSharedStorage("flipCardBackground", "#171717ff"),
  FLIPCARD_RADIUS: atomWithSharedStorage("flipcardRounded", 70), // Rounding in %
  BOX_BACKGROUND: atomWithSharedStorage("boxBackgroundColor", "#121212ab"),
  BOX_RADIUS: atomWithSharedStorage("boxRounded", 30), // Rounding in %
  SECOND_ROW_ENABLED: atomWithSharedStorage("secondRowEnabled", true),
  SECOND_ROW_CLOCK_TEXT_SIZE: atomWithSharedStorage("secondRowClockTextSize", 12), // Text Size in px
  SECOND_ROW_TIME_FORMAT: atomWithSharedStorage(
    "secondRowFormat",
    "$TIME(dddd, DD.MM) $TEXT( ) $WEATHER(feelsLikeEmoji) $TEXT( ) $WEATHER(nextSun)"
  ),
  SECOND_ROW_GAP: atomWithSharedStorage("secondRowGap", 9), // Gap in px
  WEATHER_DATA: atomWithSharedStorage("weatherData", null),
  WEATHER_LOCATION: atomWithSharedStorage("weatherLocation", ""), // Default location for weather data
  WEATHER_UNIT: atomWithSharedStorage("weatherUnit", "C"),
  SUN_TIMES: atomWithSharedStorage("sunTimes", null), // Store sunrise/sunset times
};
