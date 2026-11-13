// Choices offered by the styling window and the tuxhub schema.

export const LOCALE_OPTIONS: { code: string; name: string }[] = [
    { code: "en", name: "English" },
    { code: "de", name: "Deutsch" },
    { code: "fr", name: "Français" },
    { code: "es", name: "Español" },
    { code: "it", name: "Italiano" },
    { code: "ru", name: "Русский" },
    { code: "zh", name: "中文" },
    { code: "ja", name: "日本語" },
    { code: "sv", name: "Svenska" },
    { code: "pl", name: "Polski" },
];

export const TEMPERATURE_UNIT_OPTIONS: { value: string; label: string }[] = [
    { value: "C", label: "Celsius (°C)" },
    { value: "F", label: "Fahrenheit (°F)" },
];

export const FONT_OPTIONS: { value: string; label: string }[] = [
    { value: "\"Inter Variable\", sans-serif", label: "Inter" },
    { value: "\"JetBrains Mono Variable\", monospace", label: "JetBrains Mono" },
    { value: "Arial, sans-serif", label: "Arial" },
    { value: '"Courier New", monospace', label: "Courier New" },
    { value: "Georgia, serif", label: "Georgia" },
    { value: '"Times New Roman", serif', label: "Times New Roman" },
    { value: "Tahoma, sans-serif", label: "Tahoma" },
    { value: "Verdana, sans-serif", label: "Verdana" },
    { value: '"Trebuchet MS", sans-serif', label: "Trebuchet MS" },
    { value: "Impact, sans-serif", label: "Impact" },
    { value: '"Lucida Console", monospace', label: "Lucida Console" },
    { value: '"Segoe UI", sans-serif', label: "Segoe UI" },
];

export interface SliderConfig
{
    min: number;
    max: number;
    marks: number[];
    unit: string;
}

// Ranges of the whole-clock sliders, shared by the styling window and tuxhub.
export const SLIDER_CONFIGS: Record<"SCALE" | "CORNER_RADIUS" | "PADDING" | "GAP" | "COLUMN_WIDTH" | "ROW_HEIGHT", SliderConfig> = {
    SCALE: { min: 30, max: 300, marks: [100, 200], unit: "%" },
    CORNER_RADIUS: { min: 0, max: 64, marks: [16, 32], unit: "px" },
    PADDING: { min: 0, max: 32, marks: [8, 16], unit: "px" },
    GAP: { min: 0, max: 48, marks: [2, 24], unit: "px" },
    COLUMN_WIDTH: { min: 24, max: 192, marks: [64, 128], unit: "px" },
    ROW_HEIGHT: { min: 24, max: 192, marks: [56, 112], unit: "px" },
};
