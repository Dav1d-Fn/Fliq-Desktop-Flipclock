import { SegmentedControl } from "@mantine/core";
import { type GroupDirection } from "../../../../layout/ClockLayout";
import { useStrings } from "../../../../i18n/useStrings";
import type { BlockSettingsProps } from "../BlockEditors";
import { InspectorField } from "../InspectorField";
import { ClockStyleSettings } from "./ClockStyleSettings";
import { IconStyleSettings } from "./IconStyleSettings";

// Look of a group beyond the shared block settings: members side by side or stacked (the
// space between them is under Spacing), the colors of the clock members' styles (ClockStyleSettings), and the
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
        </>
    );
}
