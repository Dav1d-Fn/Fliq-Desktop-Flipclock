import { useAtomValue } from "jotai";
import { BLOCK_DEFAULTS } from "../../../../layout/ClockLayout";
import { named, useStrings } from "../../../../i18n/useStrings";
import { ATOMS } from "../../../../settings/atoms";
import { SliderControl } from "../../controls/SliderControl";
import type { BlockSettingsProps } from "../BlockEditors";
import { ColorSwatches } from "../ColorSwatches";
import { BACKGROUND_SWATCHES, TEXT_SWATCHES } from "../EditorSwatches";
import { InspectorField } from "../InspectorField";

interface SecondsBarSettingsProps extends BlockSettingsProps
{
    // Thickness and rounding, only for the bar.
    withBarShape: boolean;
}

// Fill and track colors of the progress style (bar, ring, dots).
export function SecondsBarSettings({ block, onChange, withBarShape }: SecondsBarSettingsProps)
{
    const defaultColor = useAtomValue(ATOMS.TEXT_COLOR);
    const strings = useStrings();
    const text = strings.secondsBar;

    return (
        <>
            <InspectorField label={text.fillColor}>
                <ColorSwatches
                    label={text.fillColor}
                    value={block.barColor}
                    onChange={(barColor) => onChange({ barColor })}
                    swatches={TEXT_SWATCHES}
                    defaultColor={defaultColor}
                />
            </InspectorField>
            <InspectorField label={text.trackColor}>
                <ColorSwatches
                    label={text.trackColor}
                    value={block.barTrackColor ?? BLOCK_DEFAULTS.barTrackColor}
                    onChange={(barTrackColor) => barTrackColor && onChange({ barTrackColor })}
                    swatches={[{ color: BLOCK_DEFAULTS.barTrackColor, label: named(strings, "Faint white") }, ...BACKGROUND_SWATCHES]}
                />
            </InspectorField>
            {withBarShape && (
                <>
                    <InspectorField label={text.thickness}>
                        <SliderControl
                            label={text.barThickness}
                            value={block.barThickness ?? BLOCK_DEFAULTS.barThickness}
                            onChange={(barThickness) => onChange({ barThickness })}
                            min={1}
                            max={24}
                            marks={[]}
                            unit="px"
                        />
                    </InspectorField>
                    <InspectorField label={text.rounding}>
                        <SliderControl
                            label={text.barRounding}
                            value={block.barRadius ?? BLOCK_DEFAULTS.barRadius}
                            onChange={(barRadius) => onChange({ barRadius })}
                            min={0}
                            max={12}
                            marks={[]}
                            unit="px"
                        />
                    </InspectorField>
                </>
            )}
        </>
    );
}
