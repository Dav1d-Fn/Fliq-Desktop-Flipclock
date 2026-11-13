import { BLOCK_DEFAULTS } from "../../../../layout/ClockLayout";
import { SliderControl } from "../../controls/SliderControl";
import type { BlockSettingsProps } from "../BlockEditors";
import { InspectorField } from "../InspectorField";
import { FlipCardSettings } from "./FlipCardSettings";

// Look of a group beyond the shared block settings: the space between members, and the card
// settings when a member is flip time.
export function GroupStyleSettings({ block, onChange }: BlockSettingsProps)
{
    const hasFlip = (block.items ?? []).some((item) => item.kind === "flip");
    return (
        <>
            {hasFlip && <FlipCardSettings block={block} onChange={onChange} />}
            <InspectorField label="Space between items">
                <SliderControl
                    label="Space between items"
                    value={block.itemGap ?? BLOCK_DEFAULTS.itemGap}
                    onChange={(itemGap) => onChange({ itemGap })}
                    min={0}
                    max={3}
                    step={0.05}
                    marks={[]}
                    unit="em"
                />
            </InspectorField>
        </>
    );
}
