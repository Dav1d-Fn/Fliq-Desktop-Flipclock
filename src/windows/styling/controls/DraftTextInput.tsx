import { useEffect, useState } from "react";
import { Textarea, TextInput } from "@mantine/core";

interface DraftTextInputProps
{
    value: string;
    onCommit: (value: string) => void;
    label?: string;
    ariaLabel?: string;
    placeholder?: string;
    disabled?: boolean;
    // Multi-line text area with this many rows; single line when not set.
    minRows?: number;
}

// Text field that edits a local draft and writes it only when the field loses focus.
//
// Templates are only valid once typed to the end; writing every keystroke would rebuild the
// clock for each half-typed placeholder. A change from outside (reset, tuxhub) replaces the
// draft.
export function DraftTextInput({ value, onCommit, label, ariaLabel, placeholder, disabled, minRows }: DraftTextInputProps)
{
    const [draft, setDraft] = useState(value);

    useEffect(() =>
    {
        setDraft(value);
    }, [value]);

    const sharedProps = {
        label,
        placeholder,
        disabled,
        value: draft,
        "aria-label": ariaLabel ?? label,
        labelProps: { style: { marginBottom: 12 } },
        onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.currentTarget.value),
        onBlur: () =>
        {
            if (draft !== value)
            {
                onCommit(draft);
            }
        },
    };

    if (minRows !== undefined)
    {
        return <Textarea {...sharedProps} minRows={minRows} />;
    }
    return <TextInput {...sharedProps} />;
}
