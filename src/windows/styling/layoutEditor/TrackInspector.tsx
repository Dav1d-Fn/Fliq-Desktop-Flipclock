import { Button } from "@mantine/core";
import { SLIDER_CONFIGS } from "../../../settings/options";
import { SliderControl } from "../controls/SliderControl";
import { InspectorField } from "./InspectorField";

interface TrackInspectorProps
{
    column: number;
    value: number;
    // False while the column follows the default under "Whole clock".
    overridden: boolean;
    onChange: (value: number | null) => void;
}

// Settings of one column: its width. Rows size themselves, see RowInspector.
export function TrackInspector({ column, value, overridden, onChange }: TrackInspectorProps)
{
    const label = `Width of column ${column + 1}`;

    return (
        <div className="inspector-body">
            <p className="inspector-intro">{label}. Blocks in this column grow or shrink with it.</p>

            <InspectorField label="Width">
                <SliderControl label={label} value={value} onChange={onChange} {...SLIDER_CONFIGS.COLUMN_WIDTH} />
                {overridden
                    ? <Button variant="subtle" size="compact-xs" onClick={() => onChange(null)}>Reset to default</Button>
                    : <p className="inspector-note">Follows the default under Whole clock.</p>}
            </InspectorField>
        </div>
    );
}
