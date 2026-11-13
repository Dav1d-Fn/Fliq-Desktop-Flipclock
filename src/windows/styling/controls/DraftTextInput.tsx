import { useEffect, useState } from "react";
import { TextInput } from "@mantine/core";

interface DraftTextInputProps
{
    value: string;
    onCommit: (value: string) => void;
    ariaLabel: string;
    placeholder?: string;
    monospace?: boolean;
    width?: number;
}

// Text field that edits a local draft and writes it only when the field loses focus or Enter is
// pressed. Writing every keystroke would rebuild the clock (separators) or start a weather
// request (city) per letter. A change from outside (reset, tuxhub) replaces the draft.
export function DraftTextInput({ value, onCommit, ariaLabel, placeholder, monospace = false, width }: DraftTextInputProps)
{
    const [draft, setDraft] = useState(value);

    useEffect(() =>
    {
        setDraft(value);
    }, [value]);

    function commit()
    {
        if (draft !== value)
        {
            onCommit(draft);
        }
    }

    return (
        <TextInput
            aria-label={ariaLabel}
            placeholder={placeholder}
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onBlur={commit}
            onKeyDown={(event) =>
            {
                if (event.key === "Enter")
                {
                    commit();
                }
            }}
            spellCheck={false}
            w={width}
            styles={monospace ? { input: { fontFamily: "var(--mantine-font-family-monospace)", fontSize: 13 } } : undefined}
        />
    );
}
