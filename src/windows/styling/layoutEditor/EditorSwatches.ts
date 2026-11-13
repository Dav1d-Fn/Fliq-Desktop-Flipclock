// Color choices of the layout editor, as #rrggbbaa like everything the settings store.

export interface Swatch
{
    color: string;
    label: string;
}

export const TEXT_SWATCHES: Swatch[] = [
    { color: "#fafafaff", label: "White" },
    { color: "#a3a3a3ff", label: "Grey" },
    { color: "#4ade80ff", label: "Green" },
    { color: "#fbbf24ff", label: "Amber" },
    { color: "#60a5faff", label: "Blue" },
    { color: "#f472b6ff", label: "Pink" },
];

export const BACKGROUND_SWATCHES: Swatch[] = [
    { color: "#121212ff", label: "Black" },
    { color: "#121212ab", label: "See-through black" },
    { color: "#1c1917ff", label: "Warm black" },
    { color: "#0f172aff", label: "Navy" },
    { color: "#14281dff", label: "Forest" },
    { color: "#3f3f46ff", label: "Graphite" },
];

export const CARD_SWATCHES: Swatch[] = [
    { color: "#1f1f1fff", label: "Dark" },
    { color: "#3a3a3aff", label: "Grey" },
    { color: "#166534ff", label: "Green" },
    { color: "#1e3a8aff", label: "Blue" },
    { color: "#9a3412ff", label: "Rust" },
];
