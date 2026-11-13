# Fliq — Desktop Flipclock

Tauri 2 + React. A frameless, always-on-top flip clock for Windows and Linux (KDE/Wayland via
gtk-layer-shell, X11 fallback). macOS is not shipped. Meant to grow into a widget board
(calendar, lists), so keep areas separate. The clock is a grid of blocks, each block one kind
(flip time, time, date, weather, text) with its own settings, or a group of such blocks.

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
  - `styling/StylingApp` — settings window: sidebar + one page at a time (`SettingsPages`).
    `layoutEditor/` is the Clock › Layout page: `LayoutCanvas` (the real GridClock with an
    editing layer: cells, snap ghost, drag and resize handles), `AddBlockBar`, and the
    inspector (`ClockInspector` for the whole clock, `BlockInspector` built from the block
    registry, `ContentEditor` for what a block or group member shows, `SelectionInspector`
    for several blocks shift/ctrl-clicked on the canvas). `pages/` the other pages,
    `controls/` and `layout/` shared pieces.
- `src/layout/` — `ClockLayout` (block and grid shapes, `LayoutGrid`: fits, free spot, snap
  targets, grouping; pure and tested), `LayoutMigration` (one-time move from the old two
  template rows).
- Groups: a block of kind `group` with `items` (members: kind and content fields only —
  display, custom format, text, weather icon) and `itemGap`. Every other field (text size,
  spacing, padding, offset, font, color, background, cards) is the group's look, shared by
  all members. It renders as one BlockContent (`GroupBlock` joins the members' segments with
  `SPACE` segments), so all members get one font size, like a line of the old template rows.
  `LayoutGrid.grouped` merges touching blocks of the same rows (groups among them are
  flattened, the leftmost block gives the look); `ungrouped` splits back into even widths
  with the group's look; `mergedInto` handles a block dropped onto another in the canvas
  (the target becomes a group on its own cells, or a group gets the block's members).
  Right-click on a group in the canvas opens `MemberMenu` for the member under the pointer
  (segments carry `member`, rendered as `data-member`; blocks carry `data-block-id`):
  `withMemberMoved`, `withMemberDetached` (own block on the next free spot; a group left
  with one member turns back into a plain block), or its settings in the inspector.
  Groups are not in the palette.
- `src/blocks/` — one `BlockDefinition` per block kind (name, default size, display options,
  the segments it shows) and `BlockRegistry`. `segments` gets a `SegmentContext` with the
  global Data › Time settings (12/24-hour, leading zero; read with `useSegmentContext`): time
  blocks only choose "with seconds" or not, `timeFormat` builds the hours from the context. The styling-window side of a kind (icon, extra
  settings) is `layoutEditor/BlockEditors`.
- `src/clock/` — `GridClock` (container + blocks; used by clock, ghost and editor), `ClockBlock`
  (one block's box and colors; remounts its content when its segments or the language change),
  `BlockContent` (own Tick.js root and timer per block, font size fitted to the block).
  `TimeCharacters` renders the Tick.js spans once and never again — React must not touch nodes
  Tick.js owns. `ClockTemplate` holds a block's segments; `parse` reads the old
  `$FLIPTIME(...)` strings for the migration only.
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

## Adding a block kind

1. `src/blocks/<Kind>Block.ts` with a `BlockDefinition`, listed in `BlockRegistry`; the kind
   name goes into `BlockKind` (`src/layout/ClockLayout.ts`).
2. Its icon (and optional settings panel in `layoutEditor/blockSettings/`) in `BlockEditors`.
   Palette, inspector and display dropdown pick it up from there.

## Adding a setting

1. Whole-clock settings: atom in `src/settings/atoms.ts` (keys never change), a field in
   `ClockInspector`, and the field in `src/tuxhub/tuxhubSchema.ts` + key in `TuxhubBridge`
   (`tests/tuxhub-schema.test.ts` fails otherwise).
2. Per-block settings: an optional field on `LayoutBlock`, read in `ClockBlock` or the block's
   definition, edited in `BlockInspector` or the kind's settings panel. tuxhub does not show
   blocks.

## Checks

- `npm run lint`, `npx tsc --noEmit`, `npm test`, `cd src-tauri && cargo test`
- Look at the real clock after visual changes (`npx tauri build --no-bundle`, run the binary).
