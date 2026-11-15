import { LayoutGrid, type ClockStyle } from "../../../../layout/ClockLayout";
import { useStrings } from "../../../../i18n/useStrings";
import type { BlockSettingsProps } from "../BlockEditors";
import { ColorSwatches } from "../ColorSwatches";
import { DIAL_SWATCHES, GLOW_SWATCHES, HAND_SWATCHES } from "../EditorSwatches";
import { InspectorField } from "../InspectorField";
import { FlipCardSettings } from "./FlipCardSettings";
import { SecondsBarSettings } from "./SecondsBarSettings";

// Each style's own colors, shown on the "default" swatch. Same values as faces.css.
const GLOW_DEFAULTS: Partial<Record<ClockStyle, string>> = { segment: "#ff3b30", dots: "#7fdcff", nixie: "#ffa64d", rings: "#ff5a4e" };
const ANALOG_DEFAULTS: Partial<Record<ClockStyle, { dial: string; hand: string; second: string }>> = {
    analogMinimal: { dial: "#20242b", hand: "#f2f4f7", second: "#ff5a4e" },
    analogClassic: { dial: "#f3efe6", hand: "#222222", second: "#b8322a" },
    analogFine: { dial: "#00000000", hand: "#ffffff", second: "#7fdcff" },
};

// Colors of the clock styles a block shows: card settings for flip, glow color for the lit
// styles, dial and hand colors for analog, fill and track (and bar size) for progress. For a group, of every clock member's style.
export function ClockStyleSettings({ block, onChange }: BlockSettingsProps)
{
    const text = useStrings().clockStyle;
    const styles = LayoutGrid.itemsOf(block)
        .filter((item) => item.kind === "clock")
        .map((item) => item.clockStyle ?? "flip");
    const glowStyle = styles.find((style) => GLOW_DEFAULTS[style]);
    const analogStyle = styles.find((style) => ANALOG_DEFAULTS[style]);
    const analog = analogStyle && ANALOG_DEFAULTS[analogStyle];

    return (
        <>
            {styles.includes("flip") && <FlipCardSettings block={block} onChange={onChange} />}
            {styles.includes("progress") && <SecondsBarSettings block={block} onChange={onChange} />}
            {glowStyle && (
                <InspectorField label={text.glowColor}>
                    <ColorSwatches
                        label={text.glowColor}
                        value={block.glowColor}
                        onChange={(glowColor) => onChange({ glowColor })}
                        swatches={GLOW_SWATCHES}
                        defaultColor={GLOW_DEFAULTS[glowStyle]}
                    />
                </InspectorField>
            )}
            {analog && (
                <>
                    <InspectorField label={text.dialColor}>
                        <ColorSwatches
                            label={text.dialColor}
                            value={block.dialColor}
                            onChange={(dialColor) => onChange({ dialColor })}
                            swatches={DIAL_SWATCHES}
                            defaultColor={analog.dial}
                        />
                    </InspectorField>
                    <InspectorField label={text.handColor}>
                        <ColorSwatches
                            label={text.handColor}
                            value={block.handColor}
                            onChange={(handColor) => onChange({ handColor })}
                            swatches={HAND_SWATCHES}
                            defaultColor={analog.hand}
                        />
                    </InspectorField>
                    <InspectorField label={text.secondHandColor}>
                        <ColorSwatches
                            label={text.secondHandColor}
                            value={block.secondHandColor}
                            onChange={(secondHandColor) => onChange({ secondHandColor })}
                            swatches={GLOW_SWATCHES}
                            defaultColor={analog.second}
                        />
                    </InspectorField>
                </>
            )}
        </>
    );
}
