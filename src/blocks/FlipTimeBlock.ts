import { timeFormat, type BlockDefinition } from "./BlockDefinition.ts";

export const FLIP_TIME_BLOCK: BlockDefinition = {
    kind: "flip",
    name: "Flip Time",
    defaultSize: { w: 3, h: 1 },
    defaults: { display: "HH:mm", customFormat: "HH:mm" },
    // Hours follow Data › Time (24/12-hour, leading zero), see timeFormat.
    displayOptions: [
        { id: "HH:mm", label: "Hours & minutes" },
        { id: "HH:mm:ss", label: "With seconds" },
    ],
    supportsCustomFormat: true,
    alignable: false,
    segments: (block, context) => [{ type: "FLIPTIME", value: timeFormat(block, context, false) }],
};
