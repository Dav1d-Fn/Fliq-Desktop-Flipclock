import { BLOCK_DEFAULTS } from "../layout/ClockLayout.ts";
import type { BlockDefinition } from "./BlockDefinition.ts";
import { blockDefinition } from "./BlockRegistry.ts";

// Several blocks' contents in one row with one look, like a line of the old template rows: one
// BlockContent, so every member gets the same font size. Made from the selection in the editor
// (LayoutGrid.grouped), never from the palette.
export const GROUP_BLOCK: BlockDefinition = {
    kind: "group",
    name: "Group",
    defaultSize: { w: 2, h: 1 },
    defaults: { display: "group", items: [] },
    displayOptions: [],
    supportsCustomFormat: false,
    alignable: true,
    // Each member shows what its own block would, with the group's look; spacers between.
    segments: (block, context) => (block.items ?? []).flatMap((item, index) => [
        ...(index > 0 ? [{ type: "SPACE" as const, value: String(block.itemGap ?? BLOCK_DEFAULTS.itemGap) }] : []),
        ...blockDefinition(item.kind).segments({ ...block, ...item }, context).map((segment) => ({ ...segment, member: index })),
    ]),
};
