import { ActionIcon, Badge, Card, Code, Collapse, Divider, Group, rem, ScrollArea, Stack, Table, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconChevronRight, IconExternalLink } from "@tabler/icons-react";
import { DATETIME_FORMATS, WEATHER_FORMATS } from "../../../settings/options";
import { LinkButton } from "../controls/LinkButton";

const CHEVRON_STYLE = { width: rem(18), height: rem(18) };

// Collapsible reference of all template placeholders and their keys.
export function FormatHelpSection()
{
    const [opened, { toggle }] = useDisclosure(false);

    return (
        <Card shadow="sm" radius="md" withBorder>
            <Group align="center">
                <Title order={4}>Display Format Help</Title>
                <ActionIcon onClick={toggle} variant="subtle" aria-label="Toggle help section">
                    {opened
                        ? <IconChevronDown color="green" style={CHEVRON_STYLE} />
                        : <IconChevronRight color="green" style={CHEVRON_STYLE} />}
                </ActionIcon>
            </Group>
            <Collapse in={opened}>
                <Divider my="sm" />
                <Stack>
                    <Text size="sm">
                        You can customize the clock display by combining fixed text with dynamic placeholders.
                    </Text>

                    <Divider label="Available Placeholders" labelPosition="left" my="xs" />
                    <Group mb="xs" wrap="wrap">
                        <Badge variant="light" color="blue">$TIME(format)</Badge>
                        <Badge variant="light" color="blue">$FLIPTIME(format)</Badge>
                        <Badge variant="light" color="green">$TEXT(content)</Badge>
                        <Badge variant="light" color="orange">$WEATHER(key)</Badge>
                    </Group>
                    <Text size="sm">
                        Example:{" "}
                        <Code>$FLIPTIME(HH:mm:ss) $TEXT(My Clock) $WEATHER(tempEmoji)</Code>
                    </Text>

                    <Divider label="$TIME / $FLIPTIME Formats (Day.js)" labelPosition="left" mt="md" />
                    <ScrollArea h={200}>
                        <Table striped highlightOnHover withColumnBorders>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Format</Table.Th>
                                    <Table.Th>Output</Table.Th>
                                    <Table.Th>Description</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {DATETIME_FORMATS.map((row) => (
                                    <Table.Tr key={row.format}>
                                        <Table.Td><Code>{row.format}</Code></Table.Td>
                                        <Table.Td>{row.output}</Table.Td>
                                        <Table.Td>{row.description}</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea>
                    <LinkButton
                        url="https://day.js.org/docs/en/display/format"
                        text="Official Day.js Documentation"
                        icon={<IconExternalLink size={16} />}
                    />

                    <Divider label="$WEATHER format keys" labelPosition="left" mt="md" />
                    <ScrollArea h={200}>
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Key</Table.Th>
                                    <Table.Th>Example Output</Table.Th>
                                    <Table.Th>Description</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {WEATHER_FORMATS.map((row) => (
                                    <Table.Tr key={row.key}>
                                        <Table.Td><Code>{row.key}</Code></Table.Td>
                                        <Table.Td>{row.example}</Table.Td>
                                        <Table.Td>{row.description}</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea>
                </Stack>
            </Collapse>
        </Card>
    );
}
