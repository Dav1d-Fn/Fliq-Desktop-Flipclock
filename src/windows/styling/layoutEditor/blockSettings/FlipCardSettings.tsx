import { BLOCK_DEFAULTS } from "../../../../layout/ClockLayout";
import { SliderControl } from "../../controls/SliderControl";
import type { BlockSettingsProps } from "../BlockEditors";
import { ColorSwatches } from "../ColorSwatches";
import { CARD_SWATCHES } from "../EditorSwatches";
import { InspectorField } from "../InspectorField";

export function FlipCardSettings({ block, onChange }: BlockSettingsProps)
{
    return (
        <>
            <InspectorField label="Card color">
                <ColorSwatches
                    label="Card color"
                    value={block.cardColor ?? BLOCK_DEFAULTS.cardColor}
                    onChange={(cardColor) => onChange({ cardColor })}
                    swatches={CARD_SWATCHES}
                />
            </InspectorField>
            <InspectorField label="Card rounding">
                <SliderControl
                    label="Card rounding"
                    value={block.cardRadius ?? BLOCK_DEFAULTS.cardRadius}
                    onChange={(cardRadius) => onChange({ cardRadius })}
                    min={0}
                    max={50}
                    marks={[]}
                    unit="%"
                />
            </InspectorField>
        </>
    );
}
