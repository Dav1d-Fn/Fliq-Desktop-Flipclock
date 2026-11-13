import { Anchor, Code, Table } from "@mantine/core";
import { DATETIME_FORMATS, WEATHER_FORMATS } from "../../../settings/options";
import { SettingRow } from "../controls/SettingRow";
import { SettingsCard } from "../controls/SettingsCard";
import { FORMAT_TOKENS } from "../FormatTokens";
import { PageHeader } from "../layout/PageHeader";
import type { PageProps } from "../SettingsPages";

// Reference of all placeholders (from FORMAT_TOKENS) and the keys they take.
export function FormatTokensPage({ navigate }: PageProps)
{
    return (
        <>
            <PageHeader
                title="Format Tokens"
                intro="Building blocks for the line formats. Each module adds its own tokens."
            />

            <SettingsCard title="Available tokens">
                {FORMAT_TOKENS.map((token) => (
                    <SettingRow
                        key={token.type}
                        label={<code className="token-chip">{token.insertText}</code>}
                        description={(
                            <>
                                {token.description}
                                {token.pageId && (
                                    <>
                                        {" "}
                                        <button type="button" className="text-link" onClick={() => navigate(token.pageId!)}>
                                            Open settings
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    >
                        <span className="token-example">{token.example()}</span>
                    </SettingRow>
                ))}
            </SettingsCard>

            <SettingsCard title="$TIME and $FLIPTIME formats (Day.js)">
                <div className="reference-table">
                    <Table striped highlightOnHover stickyHeader>
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
                </div>
                <SettingRow label="More formats" description="Everything Day.js can format works here.">
                    <Anchor href="https://day.js.org/docs/en/display/format" target="_blank" size="sm">
                        Day.js documentation
                    </Anchor>
                </SettingRow>
            </SettingsCard>

            <SettingsCard title="$WEATHER keys">
                <div className="reference-table">
                    <Table striped highlightOnHover stickyHeader>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Key</Table.Th>
                                <Table.Th>Example</Table.Th>
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
                </div>
            </SettingsCard>
        </>
    );
}
