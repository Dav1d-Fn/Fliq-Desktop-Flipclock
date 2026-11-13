import { ColorInput } from "@mantine/core";

interface ColorFieldProps
{
    label: string;
    value: string;
    onChange: (value: string) => void;
}

// Color with transparency as #rrggbbaa: swatch, hex text and picker. Writes when a pick ends,
// not on every drag step of the picker.
export function ColorField({ label, value, onChange }: ColorFieldProps)
{
    return (
        <ColorInput
            value={value}
            onChangeEnd={onChange}
            format="hexa"
            aria-label={label}
            w={200}
            styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)", fontSize: 13 } }}
        />
    );
}
