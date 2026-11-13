import { useEffect, useRef, useState } from "react";
import { ActionIcon, Group, Textarea } from "@mantine/core";
import { IconReload } from "@tabler/icons-react";
import { FORMAT_TOKENS } from "../FormatTokens";

interface FormatFieldProps
{
    // Unique id of the text field, e.g. "first-line-format".
    id: string;
    value: string;
    onCommit: (value: string) => void;
    onRestoreDefault: () => void;
}

// Format template of one clock line, with "+" chips that insert a placeholder at the cursor and
// a button for the default template.
//
// Typing edits a local draft that is written when the field loses focus: a template is only
// valid once typed to the end, and every half-typed placeholder would rebuild the clock. A chip
// inserts a complete placeholder, so it writes right away. A change from outside (reset,
// tuxhub) replaces the draft.
export function FormatField({ id, value, onCommit, onRestoreDefault }: FormatFieldProps)
{
    const [draft, setDraft] = useState(value);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() =>
    {
        setDraft(value);
    }, [value]);

    function commitDraft()
    {
        if (draft !== value)
        {
            onCommit(draft);
        }
    }

    function insertToken(insertText: string)
    {
        const textarea = textareaRef.current;
        const hasFocus = textarea !== null && document.activeElement === textarea;
        const start = hasFocus ? textarea.selectionStart : draft.length;
        const end = hasFocus ? textarea.selectionEnd : draft.length;

        // Placeholders are separated by a space for readability; the parser ignores it.
        const before = draft.slice(0, start);
        const separator = before.length > 0 && !before.endsWith(" ") ? " " : "";
        const next = before + separator + insertText + draft.slice(end);
        const cursor = before.length + separator.length + insertText.length;

        setDraft(next);
        onCommit(next);
        requestAnimationFrame(() =>
        {
            textarea?.focus();
            textarea?.setSelectionRange(cursor, cursor);
        });
    }

    return (
        <>
            <Group gap={6} className="setting-label">
                <label htmlFor={id}>Format</label>
                <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="gray"
                    onClick={onRestoreDefault}
                    aria-label="Restore default format"
                    title="Restore default format"
                >
                    <IconReload size={14} />
                </ActionIcon>
            </Group>
            <Textarea
                id={id}
                ref={textareaRef}
                value={draft}
                onChange={(event) => setDraft(event.currentTarget.value)}
                onBlur={commitDraft}
                autosize
                minRows={1}
                spellCheck={false}
                styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)", fontSize: 13 } }}
            />
            <div className="token-chips">
                {FORMAT_TOKENS.map((token) => (
                    <button
                        key={token.type}
                        type="button"
                        className="token-chip"
                        title={`Insert ${token.insertText}`}
                        // Keeps the focus and cursor in the text field.
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertToken(token.insertText)}
                    >
                        + ${token.type}
                    </button>
                ))}
            </div>
        </>
    );
}
