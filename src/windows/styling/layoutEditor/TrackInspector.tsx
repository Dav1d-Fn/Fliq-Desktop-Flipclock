import { Button } from "@mantine/core";
import type { TrackRef } from "../../../layout/ClockLayout";
import { SLIDER_CONFIGS } from "../../../settings/options";
import { SliderControl } from "../controls/SliderControl";
import { InspectorField } from "./InspectorField";

interface TrackInspectorProps
{
    track: TrackRef;
    value: number;
    // False while the column or row follows the default under "Whole clock".
    overridden: boolean;
    onChange: (value: number | null) => void;
}

// Settings of one column (its width) or one row (its height).
export function TrackInspector({ track, value, overridden, onChange }: TrackInspectorProps)
{
    const isColumn = track.axis === "column";
    const label = isColumn ? `Width of column ${track.index + 1}` : `Height of row ${track.index + 1}`;

    return (
        <div className="inspector-body">
            <p className="inspector-intro">{label}. Blocks in this {track.axis} grow or shrink with it.</p>

            <InspectorField label={isColumn ? "Width" : "Height"}>
                <SliderControl label={label} value={value} onChange={onChange} {...(isColumn ? SLIDER_CONFIGS.COLUMN_WIDTH : SLIDER_CONFIGS.ROW_HEIGHT)} />
                {overridden
                    ? <Button variant="subtle" size="compact-xs" onClick={() => onChange(null)}>Reset to default</Button>
                    : <p className="inspector-note">Follows the default under Whole clock.</p>}
            </InspectorField>
        </div>
    );
}
