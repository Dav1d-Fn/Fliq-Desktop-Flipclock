import dayjs from "dayjs";
import type { CalendarBlockSettings } from "../calendar/CalendarTypes.ts";
import type { ClockStyle, FlipUnit, ProgressMotion, ProgressUnit, TextStyle } from "../layout/ClockLayout.ts";

// SPACE: empty room between group members, value = width in em. BREAK: the same in a stacked
// group, a new line with value = room above it in em. PROGRESSBAR: the progress bar, alone in its
// block. FACE: a clock style drawn by ClockFace (`face`), value = Day.js time format. None of
// them is in the old templates. CALENDAR: upcoming events (CalendarSegment), value = layout.
export type SegmentType = "TIME" | "FLIPTIME" | "TEXT" | "WEATHER" | "SPACE" | "BREAK" | "PROGRESSBAR" | "FACE" | "CALENDAR";

// Text styles drawn as pictures instead of letters (StyledText, and ClockFace for time).
export type DrawnTextStyle = Exclude<TextStyle, "flip" | "text">;

// What ClockFace draws: time in a drawn text style, the clock faces and the round progress shapes.
export type FaceStyle = DrawnTextStyle | Exclude<ClockStyle, "digital" | "progress"> | "progressRing" | "progressDots";

export interface Segment
{
    type: SegmentType;
    value: string;
    // In a group: index of the member it belongs to (data-member in the DOM, for the editor).
    member?: number;
    // FACE only: which style draws it.
    face?: FaceStyle;
    // PROGRESSBAR and the progress faces: what fills up and how it moves.
    unit?: ProgressUnit;
    motion?: ProgressMotion;
    // CALENDAR only: which events and how.
    calendar?: CalendarBlockSettings;
    // TEXT, WEATHER and CALENDAR: how their characters are drawn, unset for plain text; flip
    // only: cards per word (unset: per character). FLIPTIME also takes flipUnit.
    textStyle?: TextStyle;
    flipUnit?: FlipUnit;
}

const SUPPORTED_TYPES: SegmentType[] = ["TIME", "FLIPTIME", "TEXT", "WEATHER"];

// What one block shows, as a list of segments: flip time, time, text and weather.
//
// Every character of a TIME/FLIPTIME segment is its own Tick.js view, addressed by a data-key.
// The same keys are used when rendering the spans and when feeding new values to Tick.js, so
// both live here. Each block has its own Tick.js root, so the keys only need to be unique per
// block.
export class ClockTemplate
{
    readonly segments: Segment[];

    constructor(segments: Segment[])
    {
        this.segments = segments;
    }

    // Reads the placeholder strings of the old two-row settings, e.g.
    // "$FLIPTIME(HH:mm) $TEXT( ) $WEATHER(temp)". Only the migration still needs it.
    static parse(template: string): Segment[]
    {
        const segments: Segment[] = [];
        const placeholder = /\$([A-Z]+)\(([^)]*)\)/g;

        let match;
        while ((match = placeholder.exec(template)) !== null)
        {
            const [, type, value] = match;
            if (SUPPORTED_TYPES.includes(type as SegmentType))
            {
                segments.push({ type: type as SegmentType, value });
            }
        }
        return segments;
    }

    // Data-key prefix of the n-th TIME/FLIPTIME segment; the character index is appended.
    static characterKeyPrefix(timeSegmentIndex: number): string
    {
        return `time${timeSegmentIndex}Character`;
    }

    // Flip cards, clock faces and drawn text fill the block's height; text keeps room above and below.
    fillsHeight(): boolean
    {
        return this.segments.some((segment) => segment.type === "FLIPTIME" || segment.type === "FACE" || segment.textStyle !== undefined);
    }

    progressBar(): Segment | undefined
    {
        return this.segments.find((segment) => segment.type === "PROGRESSBAR");
    }

    // Splits text into the pieces drawn one by one: per character, or for flip cards per word
    // the runs between spaces and commas with the separators between them.
    static slots(text: string, unit: FlipUnit = "character"): string[]
    {
        if (unit === "character")
        {
            return text.split("");
        }
        return text.split(/([\s,]+)/u).filter((slot) => slot !== "");
    }

    // Writes the current text of every time slot into `values`, keyed like the spans.
    collectValues(values: Record<string, string>): void
    {
        this.timeSegments().forEach((segment, timeSegmentIndex) =>
        {
            const keyPrefix = ClockTemplate.characterKeyPrefix(timeSegmentIndex);
            ClockTemplate.slots(dayjs().format(segment.value), segment.flipUnit).forEach((slot, slotIndex) =>
            {
                values[`${keyPrefix}${slotIndex}`] = slot;
            });
        });
    }

    // Slot lengths of all formatted time strings. The spans have one slot per character (or
    // word), so when one changes (at midnight "Sonntag" -> "Montag") the block has to be rebuilt.
    layoutSignature(): string
    {
        return this.timeSegments()
            .map((segment) => ClockTemplate.slots(dayjs().format(segment.value), segment.flipUnit).map((slot) => slot.length).join("."))
            .join(",");
    }

    // The block as plain text, for previews in the settings window. Calendar segments only
    // show something when `formatCalendar` is given.
    plainText(formatWeather: (key: string) => string, formatCalendar?: (segment: Segment) => string): string
    {
        return this.segments
            .map((segment) =>
            {
                switch (segment.type)
                {
                    case "FLIPTIME":
                    case "TIME":
                    case "FACE":
                        return dayjs().format(segment.value);
                    case "WEATHER":
                        return formatWeather(segment.value);
                    case "TEXT":
                        return segment.value;
                    case "SPACE":
                    case "BREAK":
                        return " ";
                    case "PROGRESSBAR":
                        return "";
                    case "CALENDAR":
                        return formatCalendar?.(segment) ?? "";
                }
            })
            .join("");
    }

    private timeSegments(): Segment[]
    {
        return this.segments.filter((segment) => segment.type === "FLIPTIME" || segment.type === "TIME");
    }
}
