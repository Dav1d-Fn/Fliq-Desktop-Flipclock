import dayjs from "dayjs";
import { ClockTemplate, type SegmentType } from "../../clock/ClockTemplate";
import type { PageId } from "./SettingsPages";

export interface FormatToken
{
    type: SegmentType;
    // What the "+" chip inserts into a format field.
    insertText: string;
    description: string;
    // Settings page of the module behind the token, if it has one.
    pageId?: PageId;
    // Example output for the token page.
    example: () => string;
}

// Every placeholder a clock line can use. The token page, the chips under the format fields and
// the "Used in line" badges are built from this list, so a new module adds one entry here.
export const FORMAT_TOKENS: FormatToken[] = [
    {
        type: "FLIPTIME",
        insertText: "$FLIPTIME(HH:mm)",
        description: "Time as animated flip cards. Styled under Modules › Flip Time.",
        pageId: "flip",
        example: () => dayjs().format("HH:mm"),
    },
    {
        type: "TIME",
        insertText: "$TIME(dd, DD.MM)",
        description: "Plain date or time text, in the date language set under General.",
        example: () => dayjs().format("dd, DD.MM"),
    },
    {
        type: "WEATHER",
        insertText: "$WEATHER(nextSun)",
        description: "Weather values like temp, feelsLikeEmoji or nextSun. Set up under Modules › Weather.",
        pageId: "weather",
        example: () => "🌇 16:51",
    },
    {
        type: "TEXT",
        insertText: "$TEXT( )",
        description: "Literal text, including spaces.",
        example: () => "“ ”",
    },
];

// Line numbers (1, 2) whose format contains a placeholder of `type`. The second line counts
// only while it is shown.
export function linesUsing(type: SegmentType, firstLine: string, secondLine: string, secondLineShown: boolean): number[]
{
    const formats = secondLineShown ? [firstLine, secondLine] : [firstLine];
    const lines: number[] = [];
    formats.forEach((format, index) =>
    {
        if (ClockTemplate.parse(format).some((segment) => segment.type === type))
        {
            lines.push(index + 1);
        }
    });
    return lines;
}
