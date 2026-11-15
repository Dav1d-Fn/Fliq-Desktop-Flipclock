import { Button } from "@mantine/core";
import type { TrackRef } from "../../../layout/ClockLayout";
import { SLIDER_CONFIGS } from "../../../settings/options";
import { SliderControl } from "../controls/SliderControl";
import { useStrings } from "../../../i18n/useStrings";
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
    const text = useStrings().grid;
    const label = text.trackSize(track.axis, track.index + 1);

    return (
        <div className="inspector-body">
            <p className="inspector-intro">{label}. {text.trackIntro(track.axis)}</p>

            <InspectorField label={isColumn ? text.width : text.height}>
                <SliderControl label={label} value={value} onChange={onChange} {...(isColumn ? SLIDER_CONFIGS.COLUMN_WIDTH : SLIDER_CONFIGS.ROW_HEIGHT)} />
                {overridden
                    ? <Button variant="subtle" size="compact-xs" onClick={() => onChange(null)}>{text.resetToDefault}</Button>
                    : <p className="inspector-note">{text.followsDefault}</p>}
            </InspectorField>
        </div>
    );
}
