import { textStyleOf, timeFormat, timeSegment, type BlockDefinition } from "./BlockDefinition.ts";

// The time as digits in the block's text style, or as one of the clock faces (ClockStyle). Flip
// and text are drawn by Tick.js, the progress bar by BlockContent, everything else by ClockFace.
export const CLOCK_BLOCK: BlockDefinition = {
    kind: "clock",
    name: "Clock",
    defaultSize: { w: 3, h: 1 },
    defaults: { display: "HH:mm", customFormat: "HH:mm", textStyle: "flip" },
    // Hours follow Data › Time (24/12-hour, leading zero), see timeFormat. For analog styles
    // and rings "With seconds" adds the second hand / ring.
    displayOptions: [
        { id: "HH:mm", label: "Hours & minutes" },
        { id: "HH:mm:ss", label: "With seconds" },
    ],
    supportsCustomFormat: true,
    alignable: true,
    // Progress has its own unit choice instead (ClockStylePicker).
    hidesDisplay: (block) => block.clockStyle === "progress",
    segments: (block, context) =>
    {
        const style = block.clockStyle ?? "digital";
        if (style === "progress")
        {
            const progress = { value: "", unit: block.progressUnit ?? "minute", motion: block.progressMotion ?? "smooth" };
            switch (block.progressShape ?? "bar")
            {
                case "ring":
                    return [{ type: "FACE", face: "progressRing", ...progress }];
                case "dots":
                    return [{ type: "FACE", face: "progressDots", ...progress }];
                default:
                    return [{ type: "PROGRESSBAR", ...progress }];
            }
        }
        if (style === "digital")
        {
            // Only plain text writes AM/PM after the digits.
            return [timeSegment(block, timeFormat(block, context, textStyleOf(block) === "text"))];
        }
        return [{ type: "FACE", value: timeFormat(block, context, false), face: style }];
    },
};
