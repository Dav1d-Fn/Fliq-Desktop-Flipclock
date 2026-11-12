import dayjs from "dayjs";

export type SegmentType = "TIME" | "FLIPTIME" | "TEXT" | "WEATHER";

export interface Segment
{
    type: SegmentType;
    value: string;
}

const SUPPORTED_TYPES: SegmentType[] = ["TIME", "FLIPTIME", "TEXT", "WEATHER"];

// One row of the clock, parsed from a template like "$FLIPTIME(HH:mm) $TEXT( ) $WEATHER(temp)".
//
// Every character of a TIME/FLIPTIME segment is its own Tick.js view, addressed by a data-key
// built from `keyPrefix`. The same keys are used when rendering the spans and when feeding new
// values to Tick.js, so both live here.
export class ClockTemplate
{
    readonly segments: Segment[];
    private readonly keyPrefix: string;

    constructor(template: string, keyPrefix: string)
    {
        this.segments = ClockTemplate.parse(template);
        this.keyPrefix = keyPrefix;
    }

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

        if (segments.length === 0)
        {
            segments.push({ type: "TEXT", value: "Please update your Template String!" });
        }
        return segments;
    }

    // Data-key prefix of the n-th TIME/FLIPTIME segment; the character index is appended.
    characterKeyPrefix(timeSegmentIndex: number): string
    {
        return `${this.keyPrefix}${timeSegmentIndex}Character`;
    }

    // Writes the current character of every time slot into `values`, keyed like the spans.
    collectValues(values: Record<string, string>): void
    {
        this.timeSegments().forEach((segment, timeSegmentIndex) =>
        {
            const formatted = dayjs().format(segment.value);
            const keyPrefix = this.characterKeyPrefix(timeSegmentIndex);
            for (let characterIndex = 0; characterIndex < formatted.length; characterIndex++)
            {
                values[`${keyPrefix}${characterIndex}`] = formatted.charAt(characterIndex);
            }
        });
    }

    // Lengths of all formatted time strings. The spans have one slot per character, so when a
    // length changes (at midnight "Sonntag" -> "Montag") the clock has to be rebuilt.
    layoutSignature(): string
    {
        return this.timeSegments()
            .map((segment) => dayjs().format(segment.value).length)
            .join(",");
    }

    private timeSegments(): Segment[]
    {
        return this.segments.filter((segment) => segment.type === "FLIPTIME" || segment.type === "TIME");
    }
}
