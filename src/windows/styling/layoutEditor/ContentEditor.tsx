import { TextInput } from "@mantine/core";
import { useAtomValue } from "jotai";
import { blockDefinition } from "../../../blocks/BlockRegistry";
import { ClockTemplate } from "../../../clock/ClockTemplate";
import { useSegmentContext } from "../../../clock/useSegmentContext";
import type { LayoutBlock } from "../../../layout/ClockLayout";
import { ATOMS } from "../../../settings/atoms";
import { WeatherFormatter } from "../../../weather/WeatherFormatter";
import { BLOCK_EDITORS } from "./BlockEditors";
import { DisplaySelect, type DisplayChoice } from "./DisplaySelect";
import { InspectorField } from "./InspectorField";

interface ContentEditorProps
{
    // A block, or a group member merged over its group (for the group's font and color).
    block: LayoutBlock;
    onChange: (patch: Partial<LayoutBlock>) => void;
}

// What a block shows: the display choice, the custom format and the kind's content settings.
// Shared by BlockInspector and the member list of a group.
export function ContentEditor({ block, onChange }: ContentEditorProps)
{
    const definition = blockDefinition(block.kind);
    const defaultFont = useAtomValue(ATOMS.TEXT_FONT);
    const defaultColor = useAtomValue(ATOMS.TEXT_COLOR);
    const background = useAtomValue(ATOMS.BOX_BACKGROUND);
    const weatherReport = useAtomValue(ATOMS.WEATHER_REPORT);
    const sunDays = useAtomValue(ATOMS.SUN_DAYS);
    const weatherUnit = useAtomValue(ATOMS.WEATHER_UNIT);

    const segmentContext = useSegmentContext();
    const weather = new WeatherFormatter(weatherReport, sunDays, weatherUnit, new Date());
    const previewOf = (display: string) =>
        new ClockTemplate(definition.segments({ ...block, display }, segmentContext)).plainText((key) => weather.format(key)) || "—";

    const choices: DisplayChoice[] = definition.displayOptions.map((option) => ({ ...option, preview: previewOf(option.id) }));
    if (definition.supportsCustomFormat)
    {
        choices.push({ id: "custom", label: "Custom format", code: block.customFormat, preview: previewOf("custom") });
    }

    const previewStyle = {
        background,
        color: block.color ?? defaultColor,
        fontFamily: block.font ?? defaultFont,
    };

    const ContentSettings = BLOCK_EDITORS[block.kind].contentSettings;

    return (
        <>
            {choices.length > 0 && (
                <InspectorField label="Display">
                    <DisplaySelect
                        choices={choices}
                        value={block.display}
                        onChange={(display) => onChange({ display })}
                        previewStyle={previewStyle}
                    />
                </InspectorField>
            )}

            {block.display === "custom" && (
                <InspectorField label="Your format" htmlFor="custom-format">
                    <TextInput
                        id="custom-format"
                        value={block.customFormat ?? ""}
                        onChange={(event) => onChange({ customFormat: event.currentTarget.value })}
                        placeholder="HH:mm"
                        spellCheck={false}
                        styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)", fontSize: 13 } }}
                    />
                    <div className="format-legend">
                        <code>HH</code> hour · <code>mm</code> minute · <code>ss</code> second · <code>DD</code> day ·{" "}
                        <code>MM</code> month · <code>ddd</code> weekday · <code>[text]</code> literal text.{" "}
                        <a href="https://day.js.org/docs/en/display/format" target="_blank" rel="noreferrer">All tokens</a>
                    </div>
                </InspectorField>
            )}

            {ContentSettings && <ContentSettings block={block} onChange={onChange} />}
        </>
    );
}
