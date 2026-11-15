import { SegmentedControl } from "@mantine/core";
import { IconLayoutAlignBottom, IconLayoutAlignMiddle, IconLayoutAlignTop } from "@tabler/icons-react";
import type { RowAlign } from "../../../layout/ClockLayout";
import { InspectorField } from "./InspectorField";

interface RowInspectorProps
{
    row: number;
    value: RowAlign;
    onChange: (value: RowAlign) => void;
}

const ROW_ALIGN_DATA = [
    { value: "top", label: <IconLayoutAlignTop size={16} aria-label="Top" /> },
    { value: "center", label: <IconLayoutAlignMiddle size={16} aria-label="Center" /> },
    { value: "bottom", label: <IconLayoutAlignBottom size={16} aria-label="Bottom" /> },
];

// Settings of one row. Its height follows its highest block; lower blocks sit where this says.
export function RowInspector({ row, value, onChange }: RowInspectorProps)
{
    return (
        <div className="inspector-body">
            <p className="inspector-intro">Row {row + 1} is as high as its highest block.</p>

            <InspectorField label="Lower blocks sit at">
                <SegmentedControl
                    fullWidth
                    data={ROW_ALIGN_DATA}
                    value={value}
                    onChange={(align) => onChange(align as RowAlign)}
                />
                <p className="inspector-note">Bottom lines small seconds cards up with the bottom edge of the big ones.</p>
            </InspectorField>
        </div>
    );
}
