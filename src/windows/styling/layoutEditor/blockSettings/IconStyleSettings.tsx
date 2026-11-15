import { SegmentedControl } from "@mantine/core";
import type { IconStyle } from "../../../../layout/ClockLayout";
import type { BlockSettingsProps } from "../BlockEditors";
import { InspectorField } from "../InspectorField";

const ICON_STYLE_DATA = [
    { value: "colored", label: "Colored" },
    { value: "flat", label: "Flat" },
];

// Colored emoji or flat line icons in the block's text color. Only shown while the block (or a
// member of the group) shows a weather icon.
export function IconStyleSettings({ block, onChange }: BlockSettingsProps)
{
    const shown = block.kind === "group" ? block.items ?? [] : [block];
    const showsIcons = shown.some((item) => item.kind === "weather" && item.weatherIcon !== false);
    if (!showsIcons)
    {
        return null;
    }
    return (
        <InspectorField label="Icon style">
            <SegmentedControl
                fullWidth
                data={ICON_STYLE_DATA}
                value={block.iconStyle ?? "colored"}
                onChange={(iconStyle) => onChange({ iconStyle: iconStyle as IconStyle })}
            />
        </InspectorField>
    );
}
