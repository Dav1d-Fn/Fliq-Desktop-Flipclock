import { Slider, Text } from "@mantine/core";
import type { SliderConfig } from "../../../settings/options";

type SliderControlProps = SliderConfig &
{
    label: string;
    value: number;
    disabled?: boolean;
    onChange: (value: number) => void;
};

// Labelled slider with marks. Writes on every step: the clock applies size and color changes
// in place, so live feedback costs nothing.
export function SliderControl({ label, unit, value, onChange, min, max, marks, disabled = false }: SliderControlProps)
{
    return (
        <div>
            <Text mb={10} size="sm" fw={500}>{label}</Text>
            <Slider
                value={value}
                onChange={onChange}
                disabled={disabled}
                min={min}
                max={max}
                color="green"
                size="lg"
                marks={marks.map((markValue) => ({ value: markValue, label: `${markValue}${unit}` }))}
                aria-label={`${label} control`}
            />
        </div>
    );
}
