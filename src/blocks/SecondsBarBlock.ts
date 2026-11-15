import type { BlockDefinition } from "./BlockDefinition.ts";

// A thin line that fills up over each minute, as wide as its block. Drawn by BlockContent and
// moved on by the block's own once-per-second timer. Cannot join a group (see LayoutGrid).
export const SECONDS_BAR_BLOCK: BlockDefinition = {
    kind: "secondsBar",
    name: "Seconds bar",
    defaultSize: { w: 4, h: 1 },
    defaults: { display: "bar", padding: 0 },
    displayOptions: [],
    supportsCustomFormat: false,
    alignable: false,
    textless: true,
    segments: () => [{ type: "SECONDSBAR", value: "" }],
};
