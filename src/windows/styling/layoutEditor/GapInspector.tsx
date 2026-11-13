import { Button } from "@mantine/core";
import type { GapRef } from "../../../layout/ClockLayout";
import { SLIDER_CONFIGS } from "../../../settings/options";
import { SliderControl } from "../controls/SliderControl";
import { InspectorField } from "./InspectorField";

interface GapInspectorProps
{
    gap: GapRef;
    value: number;
    // False while the gap follows the default under "Whole clock".
    overridden: boolean;
    onChange: (value: number | null) => void;
}

// Settings of one gap between two neighbouring columns or rows.
export function GapInspector({ gap, value, overridden, onChange }: GapInspectorProps)
{
    const noun = gap.axis === "column" ? "columns" : "rows";
    const label = `Space between ${noun} ${gap.index + 1} and ${gap.index + 2}`;

    return (
        <div className="inspector-body">
            <p className="inspector-intro">{label}. Blocks spanning this gap grow or shrink with it.</p>

            <InspectorField label="Distance">
                <SliderControl label={label} value={value} onChange={onChange} {...SLIDER_CONFIGS.GAP} />
                {overridden
                    ? <Button variant="subtle" size="compact-xs" onClick={() => onChange(null)}>Reset to default</Button>
                    : <p className="inspector-note">Follows the default under Whole clock.</p>}
            </InspectorField>
        </div>
    );
}
