import { SegmentedControl } from "@mantine/core";
import { BLOCK_DEFAULTS, type GroupDirection } from "../../../../layout/ClockLayout";
import { useStrings } from "../../../../i18n/useStrings";
import { SliderControl } from "../../controls/SliderControl";
import type { BlockSettingsProps } from "../BlockEditors";
import { InspectorField } from "../InspectorField";
import { ClockStyleSettings } from "./ClockStyleSettings";
import { IconStyleSettings } from "./IconStyleSettings";

// Look of a group beyond the shared block settings: members side by side or stacked, the
// space between them, the colors of the clock members' styles (ClockStyleSettings), and the
// icon style when one shows a weather icon.
export function GroupStyleSettings({ block, onChange }: BlockSettingsProps)
{
    const text = useStrings().group;
    return (
        <>
            <ClockStyleSettings block={block} onChange={onChange} />
            <IconStyleSettings block={block} onChange={onChange} />
            <InspectorField label={text.direction}>
                <SegmentedControl
                    fullWidth
                    data={[{ value: "row", label: text.sideBySide }, { value: "column", label: text.stacked }]}
                    value={block.direction ?? "row"}
                    onChange={(direction) => onChange({ direction: direction as GroupDirection })}
                />
            </InspectorField>
            <InspectorField label={text.spaceBetweenItems}>
                <SliderControl
                    label={text.spaceBetweenItems}
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
