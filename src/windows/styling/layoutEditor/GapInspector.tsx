import { Button } from "@mantine/core";
import type { GapRef } from "../../../layout/ClockLayout";
import { SLIDER_CONFIGS } from "../../../settings/options";
import { SliderControl } from "../controls/SliderControl";
import { useStrings } from "../../../i18n/useStrings";
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
    const text = useStrings().grid;
    const label = text.spaceBetween(gap.axis, gap.index + 1);

    return (
        <div className="inspector-body">
            <p className="inspector-intro">{label}. {text.gapIntro}</p>

            <InspectorField label={text.distance}>
                <SliderControl label={label} value={value} onChange={onChange} {...SLIDER_CONFIGS.GAP} />
                {overridden
                    ? <Button variant="subtle" size="compact-xs" onClick={() => onChange(null)}>{text.resetToDefault}</Button>
                    : <p className="inspector-note">{text.followsDefault}</p>}
            </InspectorField>
        </div>
    );
}
