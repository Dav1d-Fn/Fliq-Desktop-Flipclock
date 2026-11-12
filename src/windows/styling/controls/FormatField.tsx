import { ActionIcon, Group, Space, Text } from "@mantine/core";
import { IconReload } from "@tabler/icons-react";
import { DraftTextInput } from "./DraftTextInput";

interface FormatFieldProps
{
    value: string;
    onCommit: (value: string) => void;
    onRestoreDefault: () => void;
    disabled?: boolean;
    minRows?: number;
}

// "Display Format" template editor of one clock row, with a button for the default template.
export function FormatField({ value, onCommit, onRestoreDefault, disabled, minRows = 1 }: FormatFieldProps)
{
    return (
        <div>
            <Group align="center" mb={6} style={{ gap: 10 }}>
                <Text size="sm" fw={500} style={{ lineHeight: 1 }}>
                    Display Format
                </Text>
                <ActionIcon
                    size="xs"
                    color="green"
                    variant="white"
                    disabled={disabled}
                    onClick={onRestoreDefault}
                    aria-label="Restore default format"
                    title="Restore default format"
                >
                    <IconReload size={14} />
                </ActionIcon>
            </Group>
            <Space h="xs" />
            <DraftTextInput
                value={value}
                onCommit={onCommit}
                ariaLabel="Display Format"
                disabled={disabled}
                minRows={minRows}
            />
        </div>
    );
}
