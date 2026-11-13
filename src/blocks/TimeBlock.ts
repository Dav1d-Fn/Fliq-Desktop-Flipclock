import { timeFormat, type BlockDefinition } from "./BlockDefinition.ts";

export const TIME_BLOCK: BlockDefinition = {
    kind: "time",
    name: "Time",
    defaultSize: { w: 2, h: 1 },
    defaults: { display: "HH:mm", customFormat: "HH:mm" },
    // Hours follow Data › Time (24/12-hour, leading zero), see timeFormat.
    displayOptions: [
        { id: "HH:mm", label: "Hours & minutes" },
        { id: "HH:mm:ss", label: "With seconds" },
    ],
    supportsCustomFormat: true,
    alignable: true,
    segments: (block, context) => [{ type: "TIME", value: timeFormat(block, context, true) }],
};
