import { chosenFormat, type BlockDefinition } from "./BlockDefinition.ts";

export const DATE_BLOCK: BlockDefinition = {
    kind: "date",
    name: "Date",
    defaultSize: { w: 2, h: 1 },
    defaults: { display: "ddd, DD.MM", customFormat: "DD.MM" },
    displayOptions: [
        { id: "ddd, DD.MM", label: "Weekday & date", code: "ddd, DD.MM" },
        { id: "DD. MMMM", label: "Day & month", code: "DD. MMMM" },
        { id: "DD.MM.YYYY", label: "Full date", code: "DD.MM.YYYY" },
        { id: "dddd", label: "Weekday", code: "dddd" },
    ],
    supportsCustomFormat: true,
    alignable: true,
    segments: (block) => [{ type: "TIME", value: chosenFormat(block) }],
};
