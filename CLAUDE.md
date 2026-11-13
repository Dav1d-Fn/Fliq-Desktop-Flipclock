# Fliq — Desktop Flipclock

Tauri 2 + React. A frameless, always-on-top flip clock for Windows and Linux (KDE/Wayland via
gtk-layer-shell, X11 fallback). macOS is not shipped. Meant to grow into a widget board
(more rows, calendar, lists), so keep areas separate.

## Code style

- Clarity over brevity. More lines are fine if they read better; no condensed one-liners.
- TypeScript: Allman braces, four-space indent, double quotes, semicolons. Enforced by ESLint:
  `npm run lint`, and `npm run lint -- --fix` to format. Object shapes are `interface`s
  (Allman braces apply to them), unions stay `type`. Empty handlers are `() => undefined`.
- Rust follows rustfmt defaults (Allman would need nightly rustfmt).
- Classes with one clear job, one class per file, folders by area. React components and hooks
  stay functions, one per file.
- Descriptive names (`characterIndex`, not `i`). Comments in English, always.

## Layout

- `src/windows/` — one folder per window, each with its `main.tsx` entry:
  - `clock/ClockApp` — the clock window (context menu, window setup, weather updates, tuxhub).
  - `ghost/` — copy of the clock drawn on another monitor while dragging (Linux layer-shell).
  - `styling/StylingApp` — settings window: sidebar + one page at a time. `SettingsPages` lists
    the pages (group, icon, live preview on/off), `FormatTokens` the line placeholders (chips,
    token page, "Used in line" badges). `pages/` one file per page, `controls/` the setting rows
    and inputs, `layout/` sidebar, header, live preview (the real FlipClock, scaled down).
- `src/clock/` — the clock itself. `FlipClock` is mounted once per layout (`useClockLayoutKey`);
  style and weather changes re-render it in place. `TimeCharacters` renders the Tick.js spans
  once and never again — React must not touch nodes Tick.js owns. `ClockTemplate` parses
  `$FLIPTIME(...) $TEXT(...) $WEATHER(...)` rows.
- `src/weather/` — `WeatherService` (wttr.in + sunrise-sunset.org), `WeatherFormatter` (pure,
  tested), `useWeatherUpdates` (clock window only, every 15 min). Storage holds raw values.
- `src/overlay/` — `ClockWindow` (input region, size, placement), `ClockDragController`,
  `PointerMotion` (draws the dragged clock every frame; WebKitGTK delivers pointer moves in bunches).
- `src/settings/` — `atoms.ts` (every setting; localStorage keys must never change),
  `options.ts` (choices for the UI and tuxhub), `AppActions` (autostart, taskbar, on-top, quit —
  shared by context menu and tuxhub), `SettingsReset`.
- `src/tuxhub/` — live settings interface for tuxhub (Linux): `TuxhubBridge`, `tuxhubSchema`.
- `src-tauri/src/` — `lib.rs` (app setup), `commands.rs` (everything `invoke` calls),
  `overlay/` (layer-shell, monitors, ghosts; ghosts are created on the first drag and destroyed
  30 s after the last one), `tuxhub.rs` (socket server).
- HTML entries at the root: `index.html` (clock), `stylingMenu.html`, `ghost.html`.

## Adding a setting

1. Atom in `src/settings/atoms.ts`.
2. A `SettingRow` in the matching `src/windows/styling/pages/*Page.tsx`. A new module (widget)
   gets its page in `SettingsPages` under "Modules" and its placeholder in `FormatTokens`.
3. Field in `src/tuxhub/tuxhubSchema.ts` and key in `TuxhubBridge` (`tests/tuxhub-schema.test.ts`
   fails otherwise).

## Checks

- `npm run lint`, `npx tsc --noEmit`, `npm test`, `cd src-tauri && cargo test`
- Look at the real clock after visual changes (`npx tauri build --no-bundle`, run the binary).
