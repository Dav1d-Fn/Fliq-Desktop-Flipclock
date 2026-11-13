import { ClockTemplate, type Segment } from "../clock/ClockTemplate.ts";
import { BLOCK_DEFAULTS, CELL_HEIGHT, GRID_LIMITS, LayoutGrid, type ClockLayout, type LayoutBlock } from "./ClockLayout.ts";

export interface KeyValueStorage
{
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

// Storage keys of the new layout settings (see ATOMS).
export const LAYOUT_KEYS = {
    layout: "clockLayout",
    scale: "clockScale",
    cornerRadius: "clockCornerRadius",
    hourCycle: "hourCycle",
    hourLeadingZero: "hourLeadingZero",
};

// Set once the old settings were looked at, so a reset does not bring the old rows back.
const MIGRATED_MARKER = "layoutMigrated";

// Set once the per-gap values of the first gap editor were cleaned (see cleanGapOverrides).
const GAPS_CLEANED_MARKER = "gapOverridesCleaned";

// Set once the 12-hour display options were turned into the global clock format.
const HOUR_CYCLE_MARKER = "hourCycleMigrated";

// Display ids of time blocks before Data › Time: 12-hour ones, and what they become.
const TWELVE_HOUR_DISPLAYS = ["hh:mm", "h:mm A"];
const HOURS_AND_MINUTES = "HH:mm";

// Built-in gap sizes of earlier versions. The first gap editor wrote them for every gap it did
// not touch; as overrides they would hide the "Whole clock" defaults.
const OLD_DEFAULT_GAPS = [8, 2];

// Settings of the two-row clock before the grid layout, with their old defaults. They stay in
// storage untouched, so an older version still finds them.
const LEGACY_DEFAULTS = {
    format: "$FLIPTIME(HH:mm:ss)",
    secondRowEnabled: true,
    secondRowFormat: "$TIME(dddd, DD.MM) $TEXT( ) $WEATHER(feelsLikeEmoji) $TEXT( ) $WEATHER(nextSun)",
    clockTextSize: 26,
    clockTextColor: "#fafafaff",
    flipCardBackground: "#171717ff",
    flipcardRounded: 70,
    boxRounded: 30,
    clockPadding: 17,
};

const DEFAULT_COLUMNS = 6;

// Height of a flip card relative to its font size in the old clock.
const OLD_CARD_HEIGHT_PER_FONT_PX = 1.45;

// Old weather keys -> display option and emoji of the new weather block.
const LEGACY_WEATHER: Record<string, { display: string; weatherIcon: boolean }> = {
    emoji: { display: "temp", weatherIcon: true },
    temp: { display: "temp", weatherIcon: false },
    tempemoji: { display: "temp", weatherIcon: true },
    feelslike: { display: "feels", weatherIcon: false },
    feelslikeemoji: { display: "feels", weatherIcon: true },
    desc: { display: "cond", weatherIcon: false },
    descemoji: { display: "cond", weatherIcon: true },
    full: { display: "cond", weatherIcon: false },
    fullemoji: { display: "cond", weatherIcon: true },
    sunrise: { display: "sun", weatherIcon: true },
    sunset: { display: "sun", weatherIcon: true },
    nextsun: { display: "sun", weatherIcon: true },
    sunrise_noemoji: { display: "sun", weatherIcon: false },
    sunset_noemoji: { display: "sun", weatherIcon: false },
    nextsun_noemoji: { display: "sun", weatherIcon: false },
};

const FLIP_OPTIONS = ["HH:mm", "HH:mm:ss", "hh:mm"];
const TIME_OPTIONS = ["HH:mm", "HH:mm:ss", "h:mm A"];
const DATE_OPTIONS = ["ddd, DD.MM", "DD. MMMM", "DD.MM.YYYY", "dddd"];

// One-time move from the two template rows to the grid layout. Each row becomes one grid row,
// each placeholder in it one block, side by side. Colors carry over, sizes only roughly: text
// now fills its block.
export class LayoutMigration
{
    private readonly storage: KeyValueStorage;

    constructor(storage: KeyValueStorage)
    {
        this.storage = storage;
    }

    run(): void
    {
        this.cleanGapOverrides();
        this.convertOldRows();
        this.moveHourCycle();
    }

    private convertOldRows(): void
    {
        if (this.storage.getItem(MIGRATED_MARKER) !== null || this.storage.getItem(LAYOUT_KEYS.layout) !== null)
        {
            return;
        }
        this.storage.setItem(MIGRATED_MARKER, "true");

        // A clock whose rows were never changed has none of the keys; it starts with the new
        // default layout like a fresh installation.
        const touched = ["format", "secondRowFormat", "secondRowEnabled"].some((key) => this.storage.getItem(key) !== null);
        if (!touched)
        {
            return;
        }

        const layout = this.convertRows();
        const textSize = this.legacy("clockTextSize");
        const blockHeight = CELL_HEIGHT - 2 * BLOCK_DEFAULTS.padding;
        const scalePercent = Math.round(textSize * OLD_CARD_HEIGHT_PER_FONT_PX / blockHeight * 100);

        // Old rounding: percent of half the shorter side of the box.
        const scale = scalePercent / 100;
        const gridHeight = new LayoutGrid(layout).size(scale).height;
        const boxHeight = gridHeight + 2 * this.legacy("clockPadding") * scale;
        const cornerRadius = Math.round(boxHeight * this.legacy("boxRounded") / 200);

        this.storage.setItem(LAYOUT_KEYS.layout, JSON.stringify(layout));
        this.storage.setItem(LAYOUT_KEYS.scale, JSON.stringify(Math.max(30, Math.min(300, scalePercent))));
        this.storage.setItem(LAYOUT_KEYS.cornerRadius, JSON.stringify(Math.min(64, cornerRadius)));
    }

    // One-time: the 12-hour display options of flip time and time blocks became the global
    // clock format. Those blocks now show "Hours & minutes"; when every time block was 12-hour,
    // the clock format becomes 12-hour (without leading zero if none had one).
    private moveHourCycle(): void
    {
        if (this.storage.getItem(HOUR_CYCLE_MARKER) !== null)
        {
            return;
        }
        this.storage.setItem(HOUR_CYCLE_MARKER, "true");
        const stored = this.storage.getItem(LAYOUT_KEYS.layout);
        if (stored === null)
        {
            return;
        }
        const layout = JSON.parse(stored) as ClockLayout;
        const isTime = (content: { kind: string; display: string }) =>
            (content.kind === "flip" || content.kind === "time") && content.display !== "custom";
        const contents = layout.blocks
            .flatMap((block): { kind: string; display: string }[] => (block.kind === "group" ? block.items ?? [] : [block]))
            .filter(isTime);
        const twelveHour = contents.filter((content) => TWELVE_HOUR_DISPLAYS.includes(content.display));
        if (twelveHour.length === 0)
        {
            return;
        }
        if (twelveHour.length === contents.length && this.storage.getItem(LAYOUT_KEYS.hourCycle) === null)
        {
            this.storage.setItem(LAYOUT_KEYS.hourCycle, JSON.stringify("12"));
            const leadingZero = twelveHour.some((content) => content.display === "hh:mm");
            this.storage.setItem(LAYOUT_KEYS.hourLeadingZero, JSON.stringify(leadingZero));
        }
        const convert = <T extends { kind: string; display: string }>(content: T): T =>
            (isTime(content) && TWELVE_HOUR_DISPLAYS.includes(content.display) ? { ...content, display: HOURS_AND_MINUTES } : content);
        const blocks = layout.blocks.map((block) => convert({ ...block, ...(block.items && { items: block.items.map(convert) }) }));
        this.storage.setItem(LAYOUT_KEYS.layout, JSON.stringify({ ...layout, blocks }));
    }

    // One-time: per-gap values equal to an old built-in default become "follow the default"
    // again. Anything else (e.g. a 0 set on purpose) stays an override.
    private cleanGapOverrides(): void
    {
        if (this.storage.getItem(GAPS_CLEANED_MARKER) !== null)
        {
            return;
        }
        this.storage.setItem(GAPS_CLEANED_MARKER, "true");
        const stored = this.storage.getItem(LAYOUT_KEYS.layout);
        if (stored === null)
        {
            return;
        }
        const layout = JSON.parse(stored) as ClockLayout;
        const clean = (gaps: (number | null)[] | undefined) =>
            gaps?.map((gap) => (gap === null || OLD_DEFAULT_GAPS.includes(gap) ? null : gap));
        this.storage.setItem(LAYOUT_KEYS.layout, JSON.stringify({
            ...layout,
            columnGaps: clean(layout.columnGaps),
            rowGaps: clean(layout.rowGaps),
        }));
    }

    private convertRows(): ClockLayout
    {
        const rows = [this.legacy("format")];
        if (this.legacy("secondRowEnabled"))
        {
            rows.push(this.legacy("secondRowFormat"));
        }

        const rowBlocks = rows
            .map((template) => this.blocksOfRow(ClockTemplate.parse(template)))
            .filter((blocks) => blocks.length > 0);

        const columns = Math.min(GRID_LIMITS.maxColumns, Math.max(DEFAULT_COLUMNS, ...rowBlocks.map((blocks) => blocks.length)));
        const blocks: LayoutBlock[] = [];
        rowBlocks.forEach((rowOfBlocks, rowIndex) =>
        {
            const placed = rowOfBlocks.slice(0, columns);
            const widths = LayoutMigration.splitWidths(placed.map((block) => block.weight), columns);
            let x = 0;
            placed.forEach((block, blockIndex) =>
            {
                blocks.push({ ...block.block, id: blocks.length + 1, x, y: rowIndex, w: widths[blockIndex], h: 1 });
                x += widths[blockIndex];
            });
        });

        return { columns, rows: Math.max(GRID_LIMITS.minRows, rowBlocks.length), blocks };
    }

    // Blocks of one row without position, each with a weight for its share of the row width.
    private blocksOfRow(segments: Segment[]): { block: LayoutBlock; weight: number }[]
    {
        const result: { block: LayoutBlock; weight: number }[] = [];
        for (const segment of segments)
        {
            const block = this.blockOf(segment);
            if (block)
            {
                result.push({ block, weight: Math.max(2, segment.value.length) });
            }
        }
        return result;
    }

    private blockOf(segment: Segment): LayoutBlock | null
    {
        const base = { id: 0, x: 0, y: 0, w: 1, h: 1 };
        switch (segment.type)
        {
            case "FLIPTIME":
                return {
                    ...base,
                    kind: "flip",
                    ...LayoutMigration.display(segment.value, FLIP_OPTIONS),
                    color: this.legacy("clockTextColor"),
                    cardColor: this.legacy("flipCardBackground"),
                    cardRadius: this.cardRadius(),
                };
            case "TIME":
            {
                const showsTime = /[Hhms]/.test(segment.value.replace(/\[[^\]]*\]/g, ""));
                return {
                    ...base,
                    kind: showsTime ? "time" : "date",
                    ...LayoutMigration.display(segment.value, showsTime ? TIME_OPTIONS : DATE_OPTIONS),
                };
            }
            case "WEATHER":
                return { ...base, kind: "weather", ...(LEGACY_WEATHER[segment.value.toLowerCase()] ?? LEGACY_WEATHER.fullemoji) };
            case "TEXT":
                // Spaces between placeholders were only separators; the grid gap does that now.
                return segment.value.trim() === "" ? null : { ...base, kind: "text", display: "text", text: segment.value };
            case "SPACE":
                return null;
        }
    }

    // Old: percent of half the shorter side of the second row if shown (that is what existing
    // setups were tuned against), else of the first. New: percent of the card width.
    private cardRadius(): number
    {
        const shareOfCardWidth = this.legacy("secondRowEnabled") ? 0.25 : 0.6;
        return Math.min(50, Math.round(this.legacy("flipcardRounded") * shareOfCardWidth));
    }

    private static display(format: string, options: string[]): { display: string; customFormat: string }
    {
        return { display: options.includes(format) ? format : "custom", customFormat: format };
    }

    // Splits `columns` cells by weight, every block at least one cell wide.
    static splitWidths(weights: number[], columns: number): number[]
    {
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        const widths = weights.map((weight) => Math.max(1, Math.round(weight / total * columns)));
        let excess = widths.reduce((sum, width) => sum + width, 0) - columns;
        while (excess !== 0)
        {
            const widest = widths.indexOf(Math.max(...widths));
            const narrowest = widths.indexOf(Math.min(...widths));
            if (excess > 0)
            {
                widths[widest]--;
                excess--;
            }
            else
            {
                widths[narrowest]++;
                excess++;
            }
        }
        return widths;
    }

    private legacy<K extends keyof typeof LEGACY_DEFAULTS>(key: K): typeof LEGACY_DEFAULTS[K]
    {
        const stored = this.storage.getItem(key);
        if (stored === null)
        {
            return LEGACY_DEFAULTS[key];
        }
        try
        {
            return JSON.parse(stored);
        }
        catch
        {
            return LEGACY_DEFAULTS[key];
        }
    }
}
