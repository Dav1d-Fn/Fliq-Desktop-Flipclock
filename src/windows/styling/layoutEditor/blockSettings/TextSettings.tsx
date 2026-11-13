import { TextInput } from "@mantine/core";
import type { BlockSettingsProps } from "../BlockEditors";
import { InspectorField } from "../InspectorField";

export function TextSettings({ block, onChange }: BlockSettingsProps)
{
    return (
        <InspectorField label="Text" htmlFor="block-text">
            <TextInput
                id="block-text"
                value={block.text ?? ""}
                onChange={(event) => onChange({ text: event.currentTarget.value })}
            />
        </InspectorField>
    );
}
