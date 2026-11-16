import dayjs from "dayjs";
import { blockDefinition } from "../blocks/BlockRegistry.ts";
import { DEFAULT_SEGMENT_CONTEXT } from "../blocks/BlockDefinition.ts";
import { ClockTemplate } from "../clock/ClockTemplate.ts";
import { WeatherFormatter } from "../weather/WeatherFormatter.ts";
import { BLOCK_DEFAULTS, LayoutGrid, type ClockLayout, type LayoutBlock } from "./ClockLayout.ts";

// How plain text was fitted before the space cleanup: its line box (line-height 1.2) filled only
// 62 % of the room, and a block's row was that room plus its padding.
const OLD_TEXT_HEIGHT_SHARE = 0.62;
const OLD_LINE_HEIGHT = 1.2; // em

// Advance widths in em to estimate how wide sample text is: a character of JetBrains Mono (the
// default font), and an emoji (measured in the clock next to it).
// ponytail: one width for every font; proportional fonts land within ~10 %, which moves a
// migrated row by a few px. Measure on a canvas if that is ever not enough.
const CHARACTER_WIDTH = 0.6;
const EMOJI_WIDTH = 1.25;
const EMOJI = /\p{Extended_Pictographic}/u;
const JOINERS = /[\uFE0E\uFE0F\u200D]/u;

// What sample text is drawn with: 13:45:30 on 16 November 2026, 12 °C, partly cloudy.
const SAMPLE_TIME = new Date(2026, 10, 16, 13, 45, 30);
const SAMPLE_WEATHER = new WeatherFormatter(
    {
        temperatureCelsius: "12",
        temperatureFahrenheit: "54",
        feelsLikeCelsius: "10",
        feelsLikeFahrenheit: "50",
        highCelsius: "14",
        highFahrenheit: "57",
        lowCelsius: "6",
        lowFahrenheit: "43",
        descriptionEnglish: "Partly cloudy",
        descriptionLocalized: "Partly cloudy",
        latitude: "0",
        longitude: "0",
    },
    {
        latitude: "0",
        longitude: "0",
        days: [{ date: "2026-11-16", sunrise: new Date(2026, 10, 16, 7, 52).getTime(), sunset: new Date(2026, 10, 16, 16, 41).getTime() }],
    },
    "C",
    SAMPLE_TIME,
);
// ponytail: a calendar block counts as one line of this; it was new when this ran.
const SAMPLE_CALENDAR = "14:00 Meeting";

// Plain text as the old fit drew it: its size in em at font size 1.
interface TextSample
{
    // Widest line with and without letter spacing.
    spacedWidth: number;
    unspacedWidth: number;
    // All line boxes and the room between stacked members.
    lineBoxHeight: number;
}

// One-time move to "no hidden space": plain text used to keep 38 % of its row empty, and every
// block had padding (8 / 4 px when unset) even without a background, where it only acted as
// extra space between blocks. Now text is as high as its glyphs, padding without a background
// is 0 when unset and not shown, and rows have a minimum height instead of a fixed one.
//
// Turns what was implicit into settings the editor shows, so a layout looks about the same:
// - Text keeps its size: the text size is set to what the old fit drew (it also takes over the
//   left/right padding of blocks without a background, and its narrower room).
// - A row of only plain-text blocks keeps its height as its minimum height; blocks without a
//   background in it lose their top/bottom padding, which that height now holds.
// - Elsewhere a block without a background keeps its top/bottom padding stored (it still
//   works, the slider is just not shown).
// Sizes come from sample text (see TextSample), so "about the same", not to the pixel.
// ponytail: flip cards and faces in rows set by hand, and blocks over several rows, keep their
// settings; they could now grow where a row used to squeeze them.
export class HiddenSpaceMigration
{
    static withoutHiddenSpace(layout: ClockLayout): ClockLayout
    {
        const grid = new LayoutGrid(layout);
        const minimumHeights = Array.from({ length: layout.rows }, (_, row) => layout.rowHeightOverrides?.[row] ?? null);
        const rowsOfText = new Set<number>();

        // Rows without a height set by hand whose single-row blocks are all plain text keep
        // their old height as their minimum.
        for (let row = 0; row < layout.rows; row++)
        {
            const blocks = layout.blocks.filter((block) => block.y === row && block.h === 1);
            const samples = blocks.map((block) => HiddenSpaceMigration.textSample(block));
            if (minimumHeights[row] !== null || blocks.length === 0 || samples.some((sample) => sample === null))
            {
                continue;
            }
            const heights = blocks.map((block, index) =>
            {
                const oldPadding = HiddenSpaceMigration.oldPadding(block);
                const width = grid.pixelRect(block, 1).width - 2 * oldPadding.x;
                const fontSize = HiddenSpaceMigration.oldFontSize(block, samples[index]!, width);
                return fontSize * samples[index]!.lineBoxHeight / OLD_TEXT_HEIGHT_SHARE + 2 * oldPadding.y;
            });
            minimumHeights[row] = Math.round(Math.max(...heights));
            rowsOfText.add(row);
        }

        const blocks = layout.blocks.map((block) => HiddenSpaceMigration.converted(block, grid, rowsOfText.has(block.y) && block.h === 1));
        const migrated = { ...layout, blocks };
        if (minimumHeights.some((height) => height !== null))
        {
            migrated.rowHeightOverrides = minimumHeights;
        }
        return migrated;
    }

    // One block's settings without its hidden space.
    private static converted(block: LayoutBlock, grid: LayoutGrid, inRowOfText: boolean): LayoutBlock
    {
        const oldPadding = HiddenSpaceMigration.oldPadding(block);
        const blockWidth = grid.pixelRect(block, 1).width;
        const oldWidth = blockWidth - 2 * oldPadding.x;
        const converted: LayoutBlock = { ...block };

        // Without a background the padding goes: left/right into the text size (and the offset,
        // so aligned content stays put), top/bottom into the row's minimum height where there is
        // one, else it stays stored.
        let newWidth = oldWidth;
        if (!block.background)
        {
            newWidth = blockWidth;
            delete converted.paddingX;
            if (inRowOfText)
            {
                delete converted.paddingY;
            }
            else if (oldPadding.y > 0)
            {
                converted.paddingY = oldPadding.y;
            }
            const align = blockDefinition(block.kind).alignable ? block.align ?? BLOCK_DEFAULTS.align : "center";
            if (oldPadding.x > 0 && align !== "center")
            {
                converted.offsetX = (block.offsetX ?? 0) + (align === "left" ? oldPadding.x : -oldPadding.x);
            }
        }

        const oldTextSize = block.textSize ?? 100;
        const sample = HiddenSpaceMigration.textSample(block);
        let textSize = oldTextSize * oldWidth / newWidth;
        if (sample !== null)
        {
            // The same font size in the new room, height limits included (a row set by hand
            // squeezed it; now that height is only a minimum).
            const oldFontSize = HiddenSpaceMigration.oldFontSize(block, sample, oldWidth, grid);
            textSize = 100 * oldFontSize * sample.spacedWidth / newWidth;
        }
        if (Math.abs(textSize - oldTextSize) >= 0.5 && newWidth > 0)
        {
            converted.textSize = Math.max(1, Math.round(textSize));
        }
        return converted;
    }

    // Padding as the old version drew it: unset was BLOCK_DEFAULTS, background or not.
    private static oldPadding(block: LayoutBlock): { x: number; y: number }
    {
        return { x: block.paddingX ?? BLOCK_DEFAULTS.paddingX, y: block.paddingY ?? BLOCK_DEFAULTS.paddingY };
    }

    // Font size (px at scale 1) the old fit gave plain text in a room this wide: the width at
    // the text size, never wider than the unspaced text allows, and in a row set by hand (when
    // a grid is given) no higher than 62 % of the room.
    private static oldFontSize(block: LayoutBlock, sample: TextSample, width: number, grid?: LayoutGrid): number
    {
        const textSize = (block.textSize ?? 100) / 100;
        let fontSize = Math.min(textSize * width / sample.spacedWidth, width / sample.unspacedWidth);
        const fixedHeight = grid && block.h === 1 ? grid.rowHeightOverride(block.y) : null;
        if (fixedHeight !== null)
        {
            const room = fixedHeight - 2 * HiddenSpaceMigration.oldPadding(block).y;
            fontSize = Math.min(fontSize, room * OLD_TEXT_HEIGHT_SHARE / sample.lineBoxHeight);
        }
        return Math.max(0, fontSize);
    }

    // The block's content as sample text, or null when it is not all plain text (flip cards,
    // the drawn text styles, faces, the progress bar: those always filled their room).
    private static textSample(block: LayoutBlock): TextSample | null
    {
        const segments = blockDefinition(block.kind).segments(block, DEFAULT_SEGMENT_CONTEXT);
        const template = new ClockTemplate(segments);
        if (segments.length === 0 || template.fillsHeight() || template.progressBar())
        {
            return null;
        }
        const letterSpacing = block.letterSpacing ?? 0;
        const lines = [{ unspaced: 0, characters: 0 }];
        let lineBoxHeight = OLD_LINE_HEIGHT;
        for (const segment of segments)
        {
            const line = lines[lines.length - 1];
            switch (segment.type)
            {
                case "TIME":
                case "TEXT":
                case "WEATHER":
                case "CALENDAR":
                {
                    const text = HiddenSpaceMigration.sampleText(segment.type, segment.value);
                    for (const character of Array.from(text))
                    {
                        // Emoji variation selectors and joiners draw nothing of their own.
                        if (JOINERS.test(character))
                        {
                            continue;
                        }
                        line.unspaced += EMOJI.test(character) ? EMOJI_WIDTH : CHARACTER_WIDTH;
                        line.characters++;
                    }
                    break;
                }
                case "SPACE":
                    line.unspaced += Number(segment.value);
                    break;
                case "BREAK":
                    lines.push({ unspaced: 0, characters: 0 });
                    lineBoxHeight += OLD_LINE_HEIGHT + Number(segment.value);
                    break;
                default:
                    break;
            }
        }
        const unspacedWidth = Math.max(...lines.map((line) => line.unspaced));
        const spacedWidth = Math.max(...lines.map((line) => line.unspaced + letterSpacing * line.characters));
        if (unspacedWidth <= 0 || spacedWidth <= 0)
        {
            return null;
        }
        return { spacedWidth, unspacedWidth, lineBoxHeight };
    }

    private static sampleText(type: "TIME" | "TEXT" | "WEATHER" | "CALENDAR", value: string): string
    {
        switch (type)
        {
            case "TIME":
                return dayjs(SAMPLE_TIME).format(value);
            case "WEATHER":
                return SAMPLE_WEATHER.format(value);
            case "CALENDAR":
                return SAMPLE_CALENDAR;
            default:
                return value;
        }
    }
}
