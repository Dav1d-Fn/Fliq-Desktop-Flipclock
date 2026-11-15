import { SegmentedControl } from "@mantine/core";
import type { IconStyle } from "../../../../layout/ClockLayout";
import type { BlockSettingsProps } from "../BlockEditors";
import { useStrings } from "../../../../i18n/useStrings";
import { InspectorField } from "../InspectorField";

// Colored emoji or flat line icons in the block's text color. Only shown while the block (or a
// member of the group) shows a weather icon.
export function IconStyleSettings({ block, onChange }: BlockSettingsProps)
{
    const text = useStrings().iconStyle;
    const shown = block.kind === "group" ? block.items ?? [] : [block];
    const showsIcons = shown.some((item) => item.kind === "weather" && item.weatherIcon !== false);
    if (!showsIcons)
    {
        return null;
    }
    return (
        <InspectorField label={text.label}>
            <SegmentedControl
                fullWidth
                data={[{ value: "colored", label: text.colored }, { value: "flat", label: text.flat }]}
                value={block.iconStyle ?? "colored"}
                onChange={(iconStyle) => onChange({ iconStyle: iconStyle as IconStyle })}
            />
        </InspectorField>
    );
}
