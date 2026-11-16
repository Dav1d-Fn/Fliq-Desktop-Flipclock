import { TextInput } from "@mantine/core";
import { useAtomValue } from "jotai";
import { blockDefinition } from "../../../blocks/BlockRegistry";
import { useCalendarText } from "../../../calendar/useCalendarText";
import { ClockTemplate } from "../../../clock/ClockTemplate";
import { useSegmentContext } from "../../../clock/useSegmentContext";
import { CONTENT_LIMITS, type LayoutBlock } from "../../../layout/ClockLayout";
import { named, useStrings } from "../../../i18n/useStrings";
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
    // A group member: the kind's settings leave out what is the group's look.
    inGroup?: boolean;
}

// What a block shows: the display choice, the custom format and the kind's content settings.
// Shared by BlockInspector and the member list of a group.
export function ContentEditor({ block, onChange, inGroup = false }: ContentEditorProps)
{
    const definition = blockDefinition(block.kind);
    const defaultFont = useAtomValue(ATOMS.TEXT_FONT);
    const defaultColor = useAtomValue(ATOMS.TEXT_COLOR);
    const background = useAtomValue(ATOMS.BOX_BACKGROUND);
    const weatherReport = useAtomValue(ATOMS.WEATHER_REPORT);
    const sunDays = useAtomValue(ATOMS.SUN_DAYS);
    const weatherUnit = useAtomValue(ATOMS.WEATHER_UNIT);

    const segmentContext = useSegmentContext();
    const calendarText = useCalendarText();
    const strings = useStrings();
    const text = strings.content;
    const weather = new WeatherFormatter(weatherReport, sunDays, weatherUnit, new Date());
    const previewOf = (display: string) =>
        new ClockTemplate(definition.segments({ ...block, display }, segmentContext)).plainText((key) => weather.format(key), calendarText) || "—";

    const hidesDisplay = definition.hidesDisplay?.(block) ?? false;
    const choices: DisplayChoice[] = hidesDisplay ? [] : definition.displayOptions.map((option) => ({ ...option, label: named(strings, option.label), preview: previewOf(option.id) }));
    if (definition.supportsCustomFormat && !hidesDisplay)
    {
        choices.push({ id: "custom", label: text.customFormat, code: block.customFormat, preview: previewOf("custom") });
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
                <InspectorField label={text.display}>
                    <DisplaySelect
                        choices={choices}
                        value={block.display}
                        onChange={(display) => onChange({ display })}
                        previewStyle={previewStyle}
                    />
                </InspectorField>
            )}

            {block.display === "custom" && !hidesDisplay && (
                <InspectorField label={text.yourFormat} htmlFor="custom-format">
                    <TextInput
                        id="custom-format"
                        value={block.customFormat ?? ""}
                        onChange={(event) => onChange({ customFormat: event.currentTarget.value })}
                        placeholder="HH:mm"
                        maxLength={CONTENT_LIMITS.textLength}
                        spellCheck={false}
                        styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)", fontSize: 13 } }}
                    />
                    <div className="format-legend">
                        <code>HH</code> {text.hour} · <code>mm</code> {text.minute} · <code>ss</code> {text.second} · <code>DD</code> {text.day} ·{" "}
                        <code>MM</code> {text.month} · <code>ddd</code> {text.weekday} · <code>[text]</code> {text.literalText}.{" "}
                        <a href="https://day.js.org/docs/en/display/format" target="_blank" rel="noreferrer">{text.allTokens}</a>
                    </div>
                </InspectorField>
            )}

            {ContentSettings && <ContentSettings block={block} onChange={onChange} inGroup={inGroup} />}
        </>
    );
}
