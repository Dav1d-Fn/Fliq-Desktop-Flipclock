import { timeFormat, type BlockDefinition } from "./BlockDefinition.ts";

// The time in one of several styles (ClockStyle). Flip and text are drawn by Tick.js like
// before, the progress bar by BlockContent, every other style by ClockFace.
export const CLOCK_BLOCK: BlockDefinition = {
    kind: "clock",
    name: "Clock",
    defaultSize: { w: 3, h: 1 },
    defaults: { display: "HH:mm", customFormat: "HH:mm", clockStyle: "flip" },
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
        const style = block.clockStyle ?? "flip";
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
        if (style === "flip")
        {
            return [{ type: "FLIPTIME", value: timeFormat(block, context, false) }];
        }
        if (style === "text")
        {
            return [{ type: "TIME", value: timeFormat(block, context, true) }];
        }
        return [{ type: "FACE", value: timeFormat(block, context, false), face: style }];
    },
};
