import { Button } from "@mantine/core";
import { SLIDER_CONFIGS } from "../../../settings/options";
import { SliderControl } from "../controls/SliderControl";
import { useStrings } from "../../../i18n/useStrings";
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
    const text = useStrings().grid;
    const label = text.trackSize("column", column + 1);

    return (
        <div className="inspector-body">
            <p className="inspector-intro">{label}. {text.trackIntro}</p>

            <InspectorField label={text.width}>
                <SliderControl label={label} value={value} onChange={onChange} {...SLIDER_CONFIGS.COLUMN_WIDTH} />
                {overridden
                    ? <Button variant="subtle" size="compact-xs" onClick={() => onChange(null)}>{text.resetToDefault}</Button>
                    : <p className="inspector-note">{text.followsDefault}</p>}
            </InspectorField>
        </div>
    );
}
