import type { BlockDefinition } from "./BlockDefinition.ts";

export const TEXT_BLOCK: BlockDefinition = {
    kind: "text",
    name: "Text",
    defaultSize: { w: 2, h: 1 },
    defaults: { display: "text", text: "Hello" },
    displayOptions: [],
    supportsCustomFormat: false,
    alignable: true,
    // A non-breaking space keeps an empty block from collapsing to zero height.
    segments: (block) => [{ type: "TEXT", value: block.text || " " }],
};
