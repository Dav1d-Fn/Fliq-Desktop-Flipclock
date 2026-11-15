import { SegmentedControl } from "@mantine/core";
import { showsIcons } from "../../../../blocks/StyleSettings";
import { LayoutGrid, type IconStyle } from "../../../../layout/ClockLayout";
import type { BlockSettingsProps } from "../BlockEditors";
import { useStrings } from "../../../../i18n/useStrings";
import { InspectorField } from "../InspectorField";

// Colored emoji or flat line icons in the block's text color. Only shown while the block (or a
// member of the group) shows weather or calendar icons.
export function IconStyleSettings({ block, onChange }: BlockSettingsProps)
{
    const text = useStrings().iconStyle;
    if (!LayoutGrid.itemsOf(block).some(showsIcons))
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
