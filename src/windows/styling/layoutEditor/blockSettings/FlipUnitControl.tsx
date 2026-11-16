import { SegmentedControl } from "@mantine/core";
import { useStrings } from "../../../../i18n/useStrings";
import type { BlockSettingsProps } from "../BlockEditors";

// Flip style: a card per character, or per word ("So., 15.11" as [So.] [15.11]).
export function FlipUnitControl({ block, onChange }: BlockSettingsProps)
{
    const text = useStrings().clockStyle;
    return (
        <div className="progress-options">
            <span className="progress-option-label">{text.flipUnit}</span>
            <SegmentedControl
                fullWidth
                size="xs"
                data={[{ value: "character", label: text.perCharacter }, { value: "word", label: text.perWord }]}
                value={block.flipUnit ?? "character"}
                onChange={(unit) => onChange({ flipUnit: unit === "word" ? "word" : undefined })}
            />
        </div>
    );
}
