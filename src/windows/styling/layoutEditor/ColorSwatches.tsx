import { useEffect, useState } from "react";
import { ColorInput } from "@mantine/core";
import type { Swatch } from "./EditorSwatches";

interface ColorSwatchesProps
{
    label: string;
    // undefined: the clock default is used (only with `defaultColor`).
    value: string | undefined;
    onChange: (value: string | undefined) => void;
    swatches: Swatch[];
    // Offers a "use clock default" swatch first, drawn in this color.
    defaultColor?: string;
}

function sameColor(a: string | undefined, b: string | undefined): boolean
{
    return a !== undefined && b !== undefined && a.toLowerCase() === b.toLowerCase();
}

// Color as a row of swatches, plus a hex field (with transparency) for any other color.
export function ColorSwatches({ label, value, onChange, swatches, defaultColor }: ColorSwatchesProps)
{
    const shownColor = value ?? defaultColor ?? "";
    // Typing edits a draft; the color is written when a pick or the typing ends.
    const [draft, setDraft] = useState(shownColor);
    useEffect(() =>
    {
        setDraft(shownColor);
    }, [shownColor]);

    return (
        <>
            <div className="swatches" role="group" aria-label={label}>
                {defaultColor !== undefined && (
                    <button
                        type="button"
                        className="swatch default"
                        style={{ background: defaultColor }}
                        aria-label="Use clock default"
                        title="Use clock default"
                        aria-pressed={value === undefined}
                        onClick={() => onChange(undefined)}
                    />
                )}
                {swatches.map((swatch) => (
                    <button
                        key={swatch.color}
                        type="button"
                        className="swatch"
                        style={{ background: swatch.color }}
                        aria-label={swatch.label}
                        title={swatch.label}
                        aria-pressed={sameColor(value, swatch.color)}
                        onClick={() => onChange(swatch.color)}
                    />
                ))}
            </div>
            <ColorInput
                mt={10}
                size="sm"
                value={draft}
                onChange={setDraft}
                onChangeEnd={(color) => onChange(color)}
                format="hexa"
                aria-label={`${label}, hex value with optional transparency`}
                styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)", fontSize: 13 } }}
            />
        </>
    );
}
