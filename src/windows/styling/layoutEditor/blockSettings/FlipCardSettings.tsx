import { BLOCK_DEFAULTS } from "../../../../layout/ClockLayout";
import { useStrings } from "../../../../i18n/useStrings";
import { SliderControl } from "../../controls/SliderControl";
import type { BlockSettingsProps } from "../BlockEditors";
import { ColorSwatches } from "../ColorSwatches";
import { CARD_SWATCHES } from "../EditorSwatches";
import { InspectorField } from "../InspectorField";
import { InspectorGroup } from "../InspectorGroup";

export function FlipCardSettings({ block, onChange }: BlockSettingsProps)
{
    const text = useStrings().blockInspector;

    return (
        <InspectorGroup>
            <InspectorField label={text.cardColor}>
                <ColorSwatches
                    label={text.cardColor}
                    value={block.cardColor ?? BLOCK_DEFAULTS.cardColor}
                    onChange={(cardColor) => onChange({ cardColor })}
                    swatches={CARD_SWATCHES}
                />
            </InspectorField>
            <InspectorField label={text.cardRounding}>
                <SliderControl
                    label={text.cardRounding}
                    value={block.cardRadius ?? BLOCK_DEFAULTS.cardRadius}
                    onChange={(cardRadius) => onChange({ cardRadius })}
                    min={0}
                    max={50}
                    marks={[]}
                    unit="%"
                />
            </InspectorField>
        </InspectorGroup>
    );
}
