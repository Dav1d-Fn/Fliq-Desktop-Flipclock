import { createTheme, type MantineColorsTuple } from "@mantine/core";

// Accent green of the settings design; index 6 (#2fa84f) is what Mantine uses for filled parts.
const fliqGreen: MantineColorsTuple = [
    "#e8f6ec",
    "#e3f3e7",
    "#bfe5c9",
    "#94d4a6",
    "#6ac384",
    "#46b566",
    "#2fa84f",
    "#1a7f37",
    "#13652b",
    "#0b2e15",
];

// Mantine adjusted to the settings design: Inter, green accent, 8 px rounding, 36 px controls.
export const stylingTheme = createTheme({
    fontFamily: "\"Inter Variable\", system-ui, sans-serif",
    fontFamilyMonospace: "\"JetBrains Mono Variable\", monospace",
    headings: { fontFamily: "\"Inter Variable\", system-ui, sans-serif" },
    primaryColor: "fliqGreen",
    colors: { fliqGreen },
    defaultRadius: "md",
    radius: { md: "8px" },
    components: {
        Input: {
            styles: {
                input: { borderColor: "var(--fliq-border-strong)" },
            },
        },
    },
});
