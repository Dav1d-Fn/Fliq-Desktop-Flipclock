import { CSSProperties } from "react";
import { Combobox, UnstyledButton, useCombobox } from "@mantine/core";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";

export interface DisplayChoice
{
    id: string;
    label: string;
    code?: string;
    // The block rendered with this choice, as plain text.
    preview: string;
}

interface DisplaySelectProps
{
    choices: DisplayChoice[];
    value: string;
    onChange: (id: string) => void;
    // Look of the preview chips: the clock's background, the block's font and color.
    previewStyle: CSSProperties;
}

// "Display" dropdown: every option shows what the block would look like, no format strings
// except as a small hint.
export function DisplaySelect({ choices, value, onChange, previewStyle }: DisplaySelectProps)
{
    const combobox = useCombobox();
    const current = choices.find((choice) => choice.id === value) ?? choices[0];

    return (
        <Combobox
            store={combobox}
            onOptionSubmit={(id) =>
            {
                onChange(id);
                combobox.closeDropdown();
            }}
            transitionProps={{ transition: "pop-top-left", duration: 160 }}
        >
            <Combobox.Target>
                <UnstyledButton
                    className="display-select"
                    aria-haspopup="listbox"
                    aria-expanded={combobox.dropdownOpened}
                    onClick={() => combobox.toggleDropdown()}
                >
                    <span className="display-preview" style={previewStyle}>{current?.preview}</span>
                    <span className="display-label">{current?.label}</span>
                    <IconChevronDown
                        size={16}
                        className="display-chevron"
                        style={{ transform: combobox.dropdownOpened ? "rotate(180deg)" : "none" }}
                    />
                </UnstyledButton>
            </Combobox.Target>
            <Combobox.Dropdown className="display-dropdown">
                <Combobox.Options>
                    {choices.map((choice) => (
                        <Combobox.Option key={choice.id} value={choice.id} active={choice.id === value} className="display-option">
                            <span className="display-preview" style={previewStyle}>{choice.preview}</span>
                            <span className="display-option-text">
                                <span className="display-label">{choice.label}</span>
                                {choice.code && <span className="display-code">{choice.code}</span>}
                            </span>
                            {choice.id === value && <IconCheck size={16} color="var(--fliq-link)" stroke={2.4} />}
                        </Combobox.Option>
                    ))}
                </Combobox.Options>
            </Combobox.Dropdown>
        </Combobox>
    );
}
