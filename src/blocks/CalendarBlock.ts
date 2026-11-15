import { styledText, type BlockDefinition } from "./BlockDefinition.ts";

// Upcoming events of the calendars set up under Data › Calendar. The display is the layout;
// what it shows (calendars, keywords, range…) is in `calendar`.
export const CALENDAR_BLOCK: BlockDefinition = {
    kind: "calendar",
    name: "Calendar",
    defaultSize: { w: 3, h: 1 },
    defaults: { display: "next", calendar: {} },
    displayOptions: [
        { id: "next", label: "Next event" },
        { id: "list", label: "List" },
        { id: "week", label: "Week strip" },
    ],
    supportsCustomFormat: false,
    alignable: true,
    segments: (block) => [{ type: "CALENDAR", value: block.display, calendar: block.calendar ?? {}, ...styledText(block) }],
};
