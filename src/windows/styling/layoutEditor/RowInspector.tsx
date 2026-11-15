import { SegmentedControl } from "@mantine/core";
import { IconLayoutAlignBottom, IconLayoutAlignMiddle, IconLayoutAlignTop } from "@tabler/icons-react";
import type { RowAlign } from "../../../layout/ClockLayout";
import { useStrings } from "../../../i18n/useStrings";
import { InspectorField } from "./InspectorField";

interface RowInspectorProps
{
    row: number;
    value: RowAlign;
    onChange: (value: RowAlign) => void;
}

// Settings of one row. Its height follows its highest block; lower blocks sit where this says.
export function RowInspector({ row, value, onChange }: RowInspectorProps)
{
    const text = useStrings().row;
    const alignData = [
        { value: "top", label: <IconLayoutAlignTop size={16} aria-label={text.top} /> },
        { value: "center", label: <IconLayoutAlignMiddle size={16} aria-label={text.center} /> },
        { value: "bottom", label: <IconLayoutAlignBottom size={16} aria-label={text.bottom} /> },
    ];

    return (
        <div className="inspector-body">
            <p className="inspector-intro">{text.intro(row + 1)}</p>

            <InspectorField label={text.alignLabel}>
                <SegmentedControl
                    fullWidth
                    data={alignData}
                    value={value}
                    onChange={(align) => onChange(align as RowAlign)}
                />
                <p className="inspector-note">{text.alignNote}</p>
            </InspectorField>
        </div>
    );
}
