import { Select } from "@mantine/core";
import { useAtom } from "jotai";
import { LayoutGrid } from "../../../layout/ClockLayout";
import { ATOMS } from "../../../settings/atoms";
import { FONT_OPTIONS, SLIDER_CONFIGS } from "../../../settings/options";
import { SliderControl } from "../controls/SliderControl";
import { ColorSwatches } from "./ColorSwatches";
import { BACKGROUND_SWATCHES, TEXT_SWATCHES } from "./EditorSwatches";
import { InspectorField } from "./InspectorField";

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

    return (
        <div className="inspector-body">
            <p className="inspector-intro">The clock window itself, plus defaults every block inherits.</p>

            <InspectorField label="Size on the desktop">
                <SliderControl label="Size on the desktop" value={scale} onChange={setScale} {...SLIDER_CONFIGS.SCALE} />
            </InspectorField>

            <InspectorField label="Background">
                <ColorSwatches
                    label="Background"
                    value={background}
                    onChange={(color) => color && setBackground(color)}
                    swatches={BACKGROUND_SWATCHES}
                />
            </InspectorField>

            <InspectorField label="Corner rounding">
                <SliderControl label="Corner rounding" value={cornerRadius} onChange={setCornerRadius} {...SLIDER_CONFIGS.CORNER_RADIUS} />
            </InspectorField>

            <InspectorField label="Padding">
                <SliderControl label="Padding" value={padding} onChange={setPadding} {...SLIDER_CONFIGS.PADDING} />
            </InspectorField>

            <InspectorField label="Column width">
                <SliderControl
                    label="Column width"
                    value={grid.defaultTrackSize("column")}
                    onChange={(columnWidth) => setLayout((current) => ({ ...current, columnWidth }))}
                    {...SLIDER_CONFIGS.COLUMN_WIDTH}
                />
            </InspectorField>

            <InspectorField label="Row height">
                <SliderControl
                    label="Row height"
                    value={grid.defaultTrackSize("row")}
                    onChange={(rowHeight) => setLayout((current) => ({ ...current, rowHeight }))}
                    {...SLIDER_CONFIGS.ROW_HEIGHT}
                />
                <p className="inspector-note">Click the bar above a column or beside a row to size it apart.</p>
            </InspectorField>

            <InspectorField label="Space between columns">
                <SliderControl
                    label="Space between columns"
                    value={grid.defaultGap("column")}
                    onChange={(columnGap) => setLayout((current) => ({ ...current, columnGap }))}
                    {...SLIDER_CONFIGS.GAP}
                />
            </InspectorField>

            <InspectorField label="Space between rows">
                <SliderControl
                    label="Space between rows"
                    value={grid.defaultGap("row")}
                    onChange={(rowGap) => setLayout((current) => ({ ...current, rowGap }))}
                    {...SLIDER_CONFIGS.GAP}
                />
                <p className="inspector-note">Click a single gap on the clock to set it apart.</p>
            </InspectorField>

            <InspectorField label="Default font" htmlFor="default-font">
                <Select
                    id="default-font"
                    value={font}
                    onChange={(value) => value && setFont(value)}
                    data={FONT_OPTIONS}
                    allowDeselect={false}
                    renderOption={({ option }) => <span style={{ fontFamily: option.value }}>{option.label}</span>}
                />
            </InspectorField>

            <InspectorField label="Default text color">
                <ColorSwatches
                    label="Default text color"
                    value={textColor}
                    onChange={(color) => color && setTextColor(color)}
                    swatches={TEXT_SWATCHES}
                />
            </InspectorField>
        </div>
    );
}
