import { useAtomValue } from "jotai";
import { blockDefinition } from "../../../../blocks/BlockRegistry";
import { drawsText, withTextStyle } from "../../../../blocks/StyleSettings";
import { useCalendarText } from "../../../../calendar/useCalendarText";
import { ClockTemplate } from "../../../../clock/ClockTemplate";
import { useSegmentContext } from "../../../../clock/useSegmentContext";
import { LayoutGrid, type TextStyle } from "../../../../layout/ClockLayout";
import { useStrings } from "../../../../i18n/useStrings";
import { ATOMS } from "../../../../settings/atoms";
import { splitIcons } from "../../../../weather/FlatWeatherIcons";
import { WeatherFormatter } from "../../../../weather/WeatherFormatter";
import type { BlockSettingsProps } from "../BlockEditors";
import { InspectorField } from "../InspectorField";
import { TEXT_STYLES } from "./ClockStylePicker";
import { FlipUnitControl } from "./FlipUnitControl";
import { StyleTiles } from "./StyleTiles";
import { TextStylePreview } from "./TextStylePreview";

// Longest preview text; more would get too small in a tile.
const PREVIEW_LENGTH = 10;
const FALLBACK_PREVIEW = "Abc 123";

// What the block shows right now as one short line without icons, for the previews.
function usePreviewText(block: BlockSettingsProps["block"]): string
{
    const weatherReport = useAtomValue(ATOMS.WEATHER_REPORT);
    const sunDays = useAtomValue(ATOMS.SUN_DAYS);
    const weatherUnit = useAtomValue(ATOMS.WEATHER_UNIT);
    const segmentContext = useSegmentContext();
    const calendarText = useCalendarText();
    const weather = new WeatherFormatter(weatherReport, sunDays, weatherUnit, new Date());
    const segments = blockDefinition(block.kind).segments(block, segmentContext);
    const plain = new ClockTemplate(segments).plainText((key) => weather.format(key), calendarText);
    const withoutIcons = splitIcons(plain).filter(({ icon }) => !icon).map(({ part }) => part).join("");
    const short = withoutIcons.replace(/\s+/g, " ").trim().slice(0, PREVIEW_LENGTH).trim();
    return short || FALLBACK_PREVIEW;
}

// How the characters of a block or group are drawn, as live previews of what it shows. A group
// has one text style for all members; members an old version drew differently keep their own
// until one is picked here. Clock blocks pick theirs with their faces (ClockStylePicker).
export function TextStylePicker({ block, onChange }: BlockSettingsProps)
{
    const text = useStrings().clockStyle;
    const previewText = usePreviewText(block);
    const items = LayoutGrid.itemsOf(block);
    if (!items.some(drawsText))
    {
        return null;
    }
    const mixed = items.some((item) => item.textStyle !== undefined);
    const current = mixed ? "" : block.textStyle ?? "text";
    const tiles = TEXT_STYLES.map((style) => ({
        id: style,
        name: text.names[style],
        preview: <TextStylePreview style={style} text={previewText} />,
        previewLength: previewText.length,
    }));

    return (
        <InspectorField label={text.textStyle} help={mixed ? text.mixedNote : text.textStyleNote}>
            <StyleTiles
                label={text.textStyle}
                tiles={tiles}
                current={current}
                block={block}
                onPick={(style) => style !== current && onChange(withTextStyle(block, style as TextStyle))}
            />
            {current === "flip" && <FlipUnitControl block={block} onChange={onChange} />}
        </InspectorField>
    );
}
