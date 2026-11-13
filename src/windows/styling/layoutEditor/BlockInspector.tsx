import { Button, Select, SegmentedControl, Switch } from "@mantine/core";
import { IconAlignCenter, IconAlignLeft, IconAlignRight, IconStackPop, IconTrash } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { blockDefinition } from "../../../blocks/BlockRegistry";
import { BLOCK_DEFAULTS, type BlockAlign, type CellRect, type ClockLayout, type LayoutBlock } from "../../../layout/ClockLayout";
import { ATOMS } from "../../../settings/atoms";
import { FONT_OPTIONS } from "../../../settings/options";
import { SliderControl } from "../controls/SliderControl";
import { BLOCK_EDITORS } from "./BlockEditors";
import { ColorSwatches } from "./ColorSwatches";
import { ContentEditor } from "./ContentEditor";
import { BACKGROUND_SWATCHES, TEXT_SWATCHES } from "./EditorSwatches";
import { InspectorField } from "./InspectorField";
import { SizePresets } from "./SizePresets";

interface BlockInspectorProps
{
    layout: ClockLayout;
    block: LayoutBlock;
    onChange: (patch: Partial<LayoutBlock>) => void;
    onRemove: () => void;
    // Groups only: split back into one block per member.
    onUngroup: () => void;
    // Groups only: the member whose settings are open.
    openMember: number | null;
    onOpenMember: (index: number | null) => void;
}

const CLOCK_DEFAULT_FONT = "clock-default";

const ALIGN_DATA = [
    { value: "left", label: <IconAlignLeft size={16} aria-label="Align left" /> },
    { value: "center", label: <IconAlignCenter size={16} aria-label="Align center" /> },
    { value: "right", label: <IconAlignRight size={16} aria-label="Align right" /> },
];

function fontLabel(font: string): string
{
    return FONT_OPTIONS.find((option) => option.value === font)?.label ?? font;
}

// Settings of the selected block. Built from its BlockDefinition and BLOCK_EDITORS, so a new
// block kind needs no change here.
export function BlockInspector({ layout, block, onChange, onRemove, onUngroup, openMember, onOpenMember }: BlockInspectorProps)
{
    const definition = blockDefinition(block.kind);
    const editor = BLOCK_EDITORS[block.kind];
    const defaultFont = useAtomValue(ATOMS.TEXT_FONT);
    const defaultColor = useAtomValue(ATOMS.TEXT_COLOR);

    const StyleSettings = editor.styleSettings;
    const MemberSettings = editor.memberSettings;

    return (
        <div className="inspector-body">
            <div className="inspector-heading">
                <h2>{definition.name}</h2>
                <span>{block.w} × {block.h}</span>
            </div>

            {MemberSettings && <MemberSettings block={block} onChange={onChange} openMember={openMember} onOpenMember={onOpenMember} />}

            <ContentEditor block={block} onChange={onChange} />

            {definition.alignable && (
                <InspectorField label="Alignment">
                    <SegmentedControl
                        fullWidth
                        data={ALIGN_DATA}
                        value={block.align ?? BLOCK_DEFAULTS.align}
                        onChange={(align) => onChange({ align: align as BlockAlign })}
                    />
                </InspectorField>
            )}

            <InspectorField label="Font" htmlFor="block-font">
                <Select
                    id="block-font"
                    value={block.font ?? CLOCK_DEFAULT_FONT}
                    onChange={(font) => onChange({ font: font === CLOCK_DEFAULT_FONT || !font ? undefined : font })}
                    data={[
                        { value: CLOCK_DEFAULT_FONT, label: `Clock default (${fontLabel(defaultFont)})` },
                        ...FONT_OPTIONS,
                    ]}
                    allowDeselect={false}
                />
            </InspectorField>

            <InspectorField label="Color">
                <ColorSwatches
                    label="Block color"
                    value={block.color}
                    onChange={(color) => onChange({ color })}
                    swatches={TEXT_SWATCHES}
                    defaultColor={defaultColor}
                />
            </InspectorField>

            {StyleSettings && <StyleSettings block={block} onChange={onChange} />}

            <InspectorField label="Text size">
                <SliderControl
                    label="Text size"
                    value={block.textSize ?? 100}
                    onChange={(textSize) => onChange({ textSize })}
                    min={30}
                    max={250}
                    marks={[]}
                    unit="%"
                />
                <p className="inspector-note">Letter spacing first uses free room. A block whose text already fills it shrinks the text instead; lower the text size to make room. Above 100 % the text grows past the block if needed.</p>
            </InspectorField>

            <InspectorField label="Letter spacing">
                <SliderControl
                    label="Letter spacing"
                    value={block.letterSpacing ?? 0}
                    onChange={(letterSpacing) => onChange({ letterSpacing })}
                    min={-1}
                    max={0.5}
                    step={0.01}
                    marks={[]}
                    unit="em"
                />
            </InspectorField>

            <InspectorField label="Background">
                <Switch
                    label="Own background"
                    checked={block.background ?? false}
                    onChange={(event) => onChange({ background: event.currentTarget.checked })}
                />
            </InspectorField>

            {block.background && (
                <>
                    <InspectorField label="Background color">
                        <ColorSwatches
                            label="Block background color"
                            value={block.backgroundColor ?? BLOCK_DEFAULTS.backgroundColor}
                            onChange={(color) => color && onChange({ backgroundColor: color })}
                            swatches={BACKGROUND_SWATCHES}
                        />
                    </InspectorField>

                    <InspectorField label="Background rounding">
                        <SliderControl
                            label="Block background rounding"
                            value={block.backgroundRadius ?? BLOCK_DEFAULTS.backgroundRadius}
                            onChange={(backgroundRadius) => onChange({ backgroundRadius })}
                            min={0}
                            max={32}
                            marks={[]}
                            unit="px"
                        />
                    </InspectorField>
                </>
            )}

            <InspectorField label="Padding">
                <SliderControl
                    label="Block padding"
                    value={block.padding ?? BLOCK_DEFAULTS.padding}
                    onChange={(padding) => onChange({ padding })}
                    min={0}
                    max={24}
                    marks={[]}
                    unit="px"
                />
            </InspectorField>

            <InspectorField label="Offset">
                <SliderControl
                    label="Horizontal offset"
                    value={block.offsetX ?? 0}
                    onChange={(offsetX) => onChange({ offsetX })}
                    min={-64}
                    max={64}
                    marks={[]}
                    unit="px →"
                />
                <SliderControl
                    label="Vertical offset"
                    value={block.offsetY ?? 0}
                    onChange={(offsetY) => onChange({ offsetY })}
                    min={-64}
                    max={64}
                    marks={[]}
                    unit="px ↓"
                />
                {(block.offsetX || block.offsetY) ? (
                    <Button variant="subtle" size="compact-xs" onClick={() => onChange({ offsetX: undefined, offsetY: undefined })}>
                        Reset offset
                    </Button>
                ) : null}
            </InspectorField>

            <InspectorField label="Size">
                <SizePresets layout={layout} block={block} onPick={(rect: CellRect) => onChange(rect)} />
                <p className="inspector-note">Or drag the handles for any size.</p>
            </InspectorField>

            {block.kind === "group" && (
                <Button
                    className="ungroup-block"
                    variant="default"
                    leftSection={<IconStackPop size={15} />}
                    onClick={onUngroup}
                    fullWidth
                >
                    Ungroup
                </Button>
            )}

            <Button
                className="remove-block"
                variant="default"
                c="red.8"
                leftSection={<IconTrash size={15} />}
                onClick={onRemove}
                fullWidth
            >
                {block.kind === "group" ? "Remove group" : "Remove block"}
            </Button>
        </div>
    );
}
