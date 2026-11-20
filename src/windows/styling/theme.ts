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

// Neutral greys for the dark scheme, without the tint of Mantine's own dark palette.
// 0 text, 2 dimmed, 4 lines and slider tracks, 5 hover, 6 inputs and default buttons,
// 7 cards, popovers and dialogs, 8 segmented control track.
const neutralDark: MantineColorsTuple = [
    "#ededed",
    "#c9c9c9",
    "#8f8f8f",
    "#6b6b6b",
    "#2a2a2a",
    "#222222",
    "#1a1a1a",
    "#141414",
    "#0f0f0f",
    "#0c0c0c",
];

// Mantine adjusted to the settings design: Inter, green accent, 8 px rounding, 36 px controls.
export const stylingTheme = createTheme({
    fontFamily: "\"Inter Variable\", system-ui, sans-serif",
    fontFamilyMonospace: "\"JetBrains Mono Variable\", monospace",
    headings: { fontFamily: "\"Inter Variable\", system-ui, sans-serif" },
    primaryColor: "fliqGreen",
    // The accent keeps its shade in the dark scheme too.
    primaryShade: { light: 6, dark: 6 },
    colors: { fliqGreen, dark: neutralDark },
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
