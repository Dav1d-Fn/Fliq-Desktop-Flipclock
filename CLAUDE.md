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
    for several blocks shift/ctrl-clicked on the canvas). Inspector settings sit in collapsible
    `InspectorSection`s (open/closed kept in localStorage `inspectorSections`, summary shown
    while closed); long explanations go into `InspectorField`'s `help` tooltip. Rows are always
    as high as their highest block (`LayoutGrid.autoRowHeights`), no row settings; room comes
    from block padding, which every block has (unset: 8/4 with an own background, else 0).
    Column widths are per column (`columnWidths`), set by dragging the grip above a column's
    edge on the canvas (double-click resets). Column gap, row gap and row alignment (`rowAlign`,
    where blocks lower than their row sit) are one value each for the whole clock (Whole clock
    › Spacing). Offset sits under "Advanced". `pages/` the other pages,
    `controls/` and `layout/` shared pieces. `savedLayouts/`: `LayoutSwitcher` (header of the Layout
    page: load, save, save as new, discard) and the Clock › Saved layouts page; both through
    `useLayoutLibrary` over `SAVED_LAYOUTS`/`ACTIVE_LAYOUT_ID` (logic in `src/layout/LayoutLibrary`,
    tested). A saved layout is the `ClockLayout` only, not the whole-clock settings.
- `src/layout/` — `ClockLayout` (block and grid shapes, `LayoutGrid`: fits, free spot, snap
  targets, grouping; pure and tested), `LayoutMigration` (one-time moves, from the old two
  template rows on; the last one drops row heights and per-row alignments),
  `HiddenSpaceMigration` (old hidden text air and background-less padding turned into text size).
- Groups: a block of kind `group` with `items` (members: kind and content fields only —
  display, custom format, text, weather icon) and `itemGap`. Every other field (text size,
  spacing, padding, offset, font, color, background, cards) is the group's look, shared by
  all members. It renders as one BlockContent (`GroupBlock` joins the members' segments with
  `SPACE` segments, or `BREAK` segments when `direction` is `"column"`: one line per member),
  so all members get one font size, like a line of the old template rows.
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
  blocks only choose "with seconds" or not, `timeFormat` builds the hours from the context. `StyleSettings`
  maps every clock style to the look settings it uses; the inspector shows only those. The styling-window side of a kind (icon, extra
  settings) is `layoutEditor/BlockEditors`.
- `src/clock/` — `GridClock` (container + blocks; used by clock, ghost, editor and the saved
  layout thumbnails, which wrap it in `ClockPreviewContext`: own block heights, frozen, no timers), `ClockBlock`
  (one block's box and colors; remounts its content when its segments or the language change),
  `BlockContent` (own Tick.js root and timer per block, font size fitted to the block; plain
  text is trimmed to its drawn glyphs by `InkBounds`, so padding 0 means touching the edge).
  `SizeLimit` gives the text size above which the content stops growing (unspaced width,
  or the room's height when the row does not follow the block); the inspector's size slider
  ends there (`BLOCK_SIZE_LIMITS`), and a larger stored value draws (and sizes the row) like it.
  Every block (and group, one for all members) has a `textStyle`: flip, text, LCD (`segment`),
  dot matrix, nixie. Time and date run on Tick.js for flip/text and on `faces/ClockFace` for
  the drawn ones; text, weather and calendar go through `StyledText` (static flip cards built
  like Tick.js's, emoji icons left beside the text). Glyphs are data: `faces/SegmentGlyphs`
  (7-segment for digits only, 14-segment as soon as there are letters), `faces/DotGlyphs`
  (5 × 7), tested in `tests/glyphs.test.ts`. Flip `flipUnit` "word": one card per word.
  Clock blocks also have a `clockStyle` ("digital" = digits in the text style, or a face:
  analog, rings, progress ring/dots), drawn by `faces/ClockFace` (SVG/CSS sized in em, own
  once-a-second timer, colors from CSS variables in `faces.css`). A `GroupItem.textStyle` only
  comes from the migration (`LayoutMigration.withTextStyles`) for old mixed groups. The progress bar (the
  old seconds bar; shares from `ProgressShare.ts`) is drawn by BlockContent.
  `TimeCharacters` renders the Tick.js spans once and never again — React must not touch nodes
  Tick.js owns. `ClockTemplate` holds a block's segments; `parse` reads the old
  `$FLIPTIME(...)` strings for the migration only.
- `src/weather/` — `WeatherService` (wttr.in + sunrise-sunset.org), `WeatherFormatter` (pure,
  tested), `useWeatherUpdates` (clock window only, every 15 min). Storage holds raw values.
- `src/calendar/` — calendars from secret ICS links (Data › Calendar, `CalendarPage` +
  `pages/calendar/SourceEditor`). `IcsParser` (ical.js: RRULE/EXDATE/overrides expanded for a
  window, VTIMEZONE), `UpcomingEvents` (filter, range, evening switch, week strip — pure, tested,
  meant for the later smart block too), `EventFormatter` (when/icon), `CalendarEntries` (what a
  block draws). `CalendarSync` downloads through the Rust command `fetch_calendar`
  (`src-tauri/src/calendar.rs`, CORS; plain `fetch` in a browser) and caches the last good
  events in `CALENDAR_FEEDS`; `useCalendarUpdates` refreshes in the clock window. Links are
  secrets: never logged, errors are codes. The calendar block (`blocks/CalendarBlock`, drawn by
  `clock/CalendarSegment`) keeps its settings in `LayoutBlock.calendar`, its layout in `display`.
- `src/overlay/` — `ClockWindow` (input region, size, placement), `ClockDragController`,
  `PointerMotion` (draws the dragged clock every frame; WebKitGTK delivers pointer moves in bunches).
- `src/settings/` — `atoms.ts` (every setting; localStorage keys must never change),
  `options.ts` (choices for the UI and tuxhub), `AppActions` (autostart, taskbar, on-top, quit —
  shared by context menu and tuxhub), `SettingsReset`.
- `src/tuxhub/` — live settings interface for tuxhub (Linux): `TuxhubBridge`, `tuxhubSchema`.
  `settings.get`/`settings.set`/`settings.reset` reach every stored setting including the
  layout; a layout from outside is checked by `src/layout/LayoutValidator` first.
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
