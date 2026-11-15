import { useAtomValue } from "jotai";
import { BLOCK_DEFAULTS } from "../../../../layout/ClockLayout";
import { ATOMS } from "../../../../settings/atoms";
import { SliderControl } from "../../controls/SliderControl";
import type { BlockSettingsProps } from "../BlockEditors";
import { ColorSwatches } from "../ColorSwatches";
import { BACKGROUND_SWATCHES, TEXT_SWATCHES } from "../EditorSwatches";
import { InspectorField } from "../InspectorField";

export function SecondsBarSettings({ block, onChange }: BlockSettingsProps)
{
    const defaultColor = useAtomValue(ATOMS.TEXT_COLOR);

    return (
        <>
            <InspectorField label="Fill color">
                <ColorSwatches
                    label="Fill color"
                    value={block.barColor}
                    onChange={(barColor) => onChange({ barColor })}
                    swatches={TEXT_SWATCHES}
                    defaultColor={defaultColor}
                />
            </InspectorField>
            <InspectorField label="Track color">
                <ColorSwatches
                    label="Track color"
                    value={block.barTrackColor ?? BLOCK_DEFAULTS.barTrackColor}
                    onChange={(barTrackColor) => barTrackColor && onChange({ barTrackColor })}
                    swatches={[{ color: BLOCK_DEFAULTS.barTrackColor, label: "Faint white" }, ...BACKGROUND_SWATCHES]}
                />
            </InspectorField>
            <InspectorField label="Thickness">
                <SliderControl
                    label="Bar thickness"
                    value={block.barThickness ?? BLOCK_DEFAULTS.barThickness}
                    onChange={(barThickness) => onChange({ barThickness })}
                    min={1}
                    max={24}
                    marks={[]}
                    unit="px"
                />
            </InspectorField>
            <InspectorField label="Rounding">
                <SliderControl
                    label="Bar rounding"
                    value={block.barRadius ?? BLOCK_DEFAULTS.barRadius}
                    onChange={(barRadius) => onChange({ barRadius })}
                    min={0}
                    max={12}
                    marks={[]}
                    unit="px"
                />
            </InspectorField>
        </>
    );
}
