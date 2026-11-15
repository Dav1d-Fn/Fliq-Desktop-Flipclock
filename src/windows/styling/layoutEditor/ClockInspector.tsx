import { Select } from "@mantine/core";
import { useAtom } from "jotai";
import { LayoutGrid } from "../../../layout/ClockLayout";
import { useStrings } from "../../../i18n/useStrings";
import { ATOMS } from "../../../settings/atoms";
import { FONT_OPTIONS, SLIDER_CONFIGS } from "../../../settings/options";
import { SliderControl } from "../controls/SliderControl";
import { ColorSwatches } from "./ColorSwatches";
import { BACKGROUND_SWATCHES, TEXT_SWATCHES } from "./EditorSwatches";
import { ColorDot } from "./ColorDot";
import { InspectorField } from "./InspectorField";
import { InspectorSection } from "./InspectorSection";

// "Whole clock": the window itself and the defaults every block inherits.
export function ClockInspector()
{
    const [scale, setScale] = useAtom(ATOMS.CLOCK_SCALE);
    const [background, setBackground] = useAtom(ATOMS.BOX_BACKGROUND);
    const [cornerRadius, setCornerRadius] = useAtom(ATOMS.CLOCK_CORNER_RADIUS);
    const [padding, setPadding] = useAtom(ATOMS.CLOCK_PADDING);
    const [font, setFont] = useAtom(ATOMS.TEXT_FONT);
    const [textColor, setTextColor] = useAtom(ATOMS.TEXT_COLOR);
    const [layout, setLayout] = useAtom(ATOMS.CLOCK_LAYOUT);
    const grid = new LayoutGrid(layout);
    const text = useStrings().clockInspector;

    const fontLabel = FONT_OPTIONS.find((option) => option.value === font)?.label ?? font;

    return (
        <div className="inspector-body">
            <p className="inspector-intro">{text.intro}</p>

            <InspectorSection id="clock-window" title={text.sectionWindow} summary={<><ColorDot color={background} />{scale} %</>} defaultOpen>
                <InspectorField label={text.size}>
                    <SliderControl label={text.size} value={scale} onChange={setScale} {...SLIDER_CONFIGS.SCALE} />
                </InspectorField>

                <InspectorField label={text.background}>
                    <ColorSwatches
                        label={text.background}
                        value={background}
                        onChange={(color) => color && setBackground(color)}
                        swatches={BACKGROUND_SWATCHES}
                    />
                </InspectorField>

                <InspectorField label={text.cornerRounding}>
                    <SliderControl label={text.cornerRounding} value={cornerRadius} onChange={setCornerRadius} {...SLIDER_CONFIGS.CORNER_RADIUS} />
                </InspectorField>

                <InspectorField label={text.padding}>
                    <SliderControl label={text.padding} value={padding} onChange={setPadding} {...SLIDER_CONFIGS.PADDING} />
                </InspectorField>
            </InspectorSection>

            <InspectorSection
                id="clock-grid"
                title={text.sectionGrid}
                summary={text.gridSummary(grid.defaultColumnWidth(), grid.defaultGap("column"), grid.defaultGap("row"))}
                defaultOpen={false}
            >
                <InspectorField label={text.columnWidth} help={text.rowHeightNote}>
                    <SliderControl
                        label={text.columnWidth}
                        value={grid.defaultColumnWidth()}
                        onChange={(columnWidth) => setLayout((current) => ({ ...current, columnWidth }))}
                        {...SLIDER_CONFIGS.COLUMN_WIDTH}
                    />
                </InspectorField>

                <InspectorField label={text.columnSpace} help={text.gapNote}>
                    <SliderControl
                        label={text.columnSpace}
                        value={grid.defaultGap("column")}
                        onChange={(columnGap) => setLayout((current) => ({ ...current, columnGap }))}
                        {...SLIDER_CONFIGS.GAP}
                    />
                </InspectorField>

                <InspectorField label={text.rowSpace} help={text.gapNote}>
                    <SliderControl
                        label={text.rowSpace}
                        value={grid.defaultGap("row")}
                        onChange={(rowGap) => setLayout((current) => ({ ...current, rowGap }))}
                        {...SLIDER_CONFIGS.GAP}
                    />
                </InspectorField>
            </InspectorSection>

            <InspectorSection id="clock-text" title={text.sectionText} summary={<><ColorDot color={textColor} />{fontLabel}</>} defaultOpen>
                <InspectorField label={text.defaultFont} htmlFor="default-font">
                    <Select
                        id="default-font"
                        value={font}
                        onChange={(value) => value && setFont(value)}
                        data={FONT_OPTIONS}
                        allowDeselect={false}
                        renderOption={({ option }) => <span style={{ fontFamily: option.value }}>{option.label}</span>}
                    />
                </InspectorField>

                <InspectorField label={text.defaultTextColor}>
                    <ColorSwatches
                        label={text.defaultTextColor}
                        value={textColor}
                        onChange={(color) => color && setTextColor(color)}
                        swatches={TEXT_SWATCHES}
                    />
                </InspectorField>
            </InspectorSection>
        </div>
    );
}
