import { TextInput } from "@mantine/core";
import { useStrings } from "../../../../i18n/useStrings";
import type { BlockSettingsProps } from "../BlockEditors";
import { InspectorField } from "../InspectorField";

export function TextSettings({ block, onChange }: BlockSettingsProps)
{
    const text = useStrings().blockInspector;

    return (
        <InspectorField label={text.text} htmlFor="block-text">
            <TextInput
                id="block-text"
                value={block.text ?? ""}
                onChange={(event) => onChange({ text: event.currentTarget.value })}
            />
        </InspectorField>
    );
}
