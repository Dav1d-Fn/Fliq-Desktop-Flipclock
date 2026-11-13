import { Slider } from "@mantine/core";
import type { SliderConfig } from "../../../settings/options";

type SliderControlProps = SliderConfig &
{
    // Accessible name; the visible label is the SettingRow's.
    label: string;
    value: number;
    onChange: (value: number) => void;
    step?: number;
};

// Slider with its current value on the right. Writes on every step: the clock applies size and
// color changes in place, so live feedback costs nothing.
export function SliderControl({ label, unit, value, onChange, min, max, step }: SliderControlProps)
{
    return (
        <div className="slider-control">
            <Slider
                value={value}
                onChange={onChange}
                min={min}
                max={max}
                step={step}
                label={null}
                aria-label={label}
            />
            <span className="slider-value">{value} {unit}</span>
        </div>
    );
}
