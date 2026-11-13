import dayjs from "dayjs";

// SPACE: empty room between group members, value = width in em. Never in the old templates.
export type SegmentType = "TIME" | "FLIPTIME" | "TEXT" | "WEATHER" | "SPACE";

export interface Segment
{
    type: SegmentType;
    value: string;
    // In a group: index of the member it belongs to (data-member in the DOM, for the editor).
    member?: number;
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

    hasFlipTime(): boolean
    {
        return this.segments.some((segment) => segment.type === "FLIPTIME");
    }

    // Writes the current character of every time slot into `values`, keyed like the spans.
    collectValues(values: Record<string, string>): void
    {
        this.timeSegments().forEach((segment, timeSegmentIndex) =>
        {
            const formatted = dayjs().format(segment.value);
            const keyPrefix = ClockTemplate.characterKeyPrefix(timeSegmentIndex);
            for (let characterIndex = 0; characterIndex < formatted.length; characterIndex++)
            {
                values[`${keyPrefix}${characterIndex}`] = formatted.charAt(characterIndex);
            }
        });
    }

    // Lengths of all formatted time strings. The spans have one slot per character, so when a
    // length changes (at midnight "Sonntag" -> "Montag") the block has to be rebuilt.
    layoutSignature(): string
    {
        return this.timeSegments()
            .map((segment) => dayjs().format(segment.value).length)
            .join(",");
    }

    // The block as plain text, for previews in the settings window.
    plainText(formatWeather: (key: string) => string): string
    {
        return this.segments
            .map((segment) =>
            {
                switch (segment.type)
                {
                    case "FLIPTIME":
                    case "TIME":
                        return dayjs().format(segment.value);
                    case "WEATHER":
                        return formatWeather(segment.value);
                    case "TEXT":
                        return segment.value;
                    case "SPACE":
                        return " ";
                }
            })
            .join("");
    }

    private timeSegments(): Segment[]
    {
        return this.segments.filter((segment) => segment.type === "FLIPTIME" || segment.type === "TIME");
    }
}
