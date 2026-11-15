import { Button, Select, SegmentedControl, Switch } from "@mantine/core";
import { IconAlignCenter, IconAlignLeft, IconAlignRight, IconStackPop, IconTrash } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { blockDefinition } from "../../../blocks/BlockRegistry";
import { settingsOf } from "../../../blocks/StyleSettings";
import { BLOCK_SIZE_LIMITS } from "../../../clock/useLayoutGrid";
import { BLOCK_DEFAULTS, type BlockAlign, type CellRect, type ClockLayout, type LayoutBlock } from "../../../layout/ClockLayout";
import { named, useStrings } from "../../../i18n/useStrings";
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

// Text size slider range in %. The end is where the content stops growing in the block's room
// (measured by the clock, see maxSizeShare); the fallback only until it is measured.
const SIZE_MIN = 30;
const SIZE_FALLBACK_MAX = 250;

function fontLabel(font: string): string
{
    return FONT_OPTIONS.find((option) => option.value === font)?.label ?? font;
}

// Settings of the selected block. Built from its BlockDefinition and BLOCK_EDITORS, so a new
// block kind needs no change here. Look settings only when they change something the block
// shows (settingsOf).
export function BlockInspector({ layout, block, onChange, onRemove, onUngroup, openMember, onOpenMember }: BlockInspectorProps)
{
    const definition = blockDefinition(block.kind);
    const editor = BLOCK_EDITORS[block.kind];
    const defaultFont = useAtomValue(ATOMS.TEXT_FONT);
    const defaultColor = useAtomValue(ATOMS.TEXT_COLOR);
    const sizeLimit = useAtomValue(BLOCK_SIZE_LIMITS)[block.id] ?? SIZE_FALLBACK_MAX;
    // A block whose content stops growing below SIZE_MIN (e.g. strongly negative letter
    // spacing) still gets a range that changes something.
    const sizeMin = Math.max(1, Math.min(SIZE_MIN, Math.floor(sizeLimit / 2)));
    const sizeMax = Math.max(sizeMin + 1, sizeLimit);
    const strings = useStrings();
    const text = strings.blockInspector;
    const alignData = [
        { value: "left", label: <IconAlignLeft size={16} aria-label={text.alignLeft} /> },
        { value: "center", label: <IconAlignCenter size={16} aria-label={text.alignCenter} /> },
        { value: "right", label: <IconAlignRight size={16} aria-label={text.alignRight} /> },
    ];

    const settings = settingsOf(block);
    // A drawn style's whole picture scales with the size slider, text with the text size.
    const sizeLabel = settings.has("size") ? text.drawnSize : text.textSize;
    // On rings alone the text color is only the time in the middle.
    const colorLabel = settings.has("labelSize") && !settings.has("textSize") ? strings.clockStyle.labelColor : text.color;
    const StyleSettings = editor.styleSettings;
    const MemberSettings = editor.memberSettings;

    return (
        <div className="inspector-body">
            <div className="inspector-heading">
                <h2>{named(strings, definition.name)}</h2>
                <span>{block.w} × {block.h}</span>
            </div>

            {MemberSettings && <MemberSettings block={block} onChange={onChange} openMember={openMember} onOpenMember={onOpenMember} />}

            <ContentEditor block={block} onChange={onChange} />

            {settings.has("align") && (
                <InspectorField label={text.alignment}>
                    <SegmentedControl
                        fullWidth
                        data={alignData}
                        value={block.align ?? BLOCK_DEFAULTS.align}
                        onChange={(align) => onChange({ align: align as BlockAlign })}
                    />
                </InspectorField>
            )}

            {settings.has("font") && (
                <InspectorField label={text.font} htmlFor="block-font">
                    <Select
                        id="block-font"
                        value={block.font ?? CLOCK_DEFAULT_FONT}
                        onChange={(font) => onChange({ font: font === CLOCK_DEFAULT_FONT || !font ? undefined : font })}
                        data={[
                            { value: CLOCK_DEFAULT_FONT, label: text.clockDefaultFont(fontLabel(defaultFont)) },
                            ...FONT_OPTIONS,
                        ]}
                        allowDeselect={false}
                    />
                </InspectorField>
            )}

            {settings.has("color") && (
                <InspectorField label={colorLabel}>
                    <ColorSwatches
                        label={text.blockColor}
                        value={block.color}
                        onChange={(color) => onChange({ color })}
                        swatches={TEXT_SWATCHES}
                        defaultColor={defaultColor}
                    />
                </InspectorField>
            )}

            {StyleSettings && <StyleSettings block={block} onChange={onChange} />}

            {(settings.has("textSize") || settings.has("size")) && (
                <InspectorField label={sizeLabel}>
                    <SliderControl
                        label={sizeLabel}
                        value={Math.min(block.textSize ?? 100, sizeMax)}
                        onChange={(textSize) => onChange({ textSize })}
                        min={sizeMin}
                        max={sizeMax}
                        marks={[]}
                        unit="%"
                    />
                    <p className="inspector-note">{settings.has("size") ? text.drawnSizeNote : text.textSizeNote}</p>
                </InspectorField>
            )}

            {settings.has("letterSpacing") && (
                <InspectorField label={text.letterSpacing}>
                    <SliderControl
                        label={text.letterSpacing}
                        value={block.letterSpacing ?? 0}
                        onChange={(letterSpacing) => onChange({ letterSpacing })}
                        min={-1}
                        max={0.5}
                        step={0.01}
                        marks={[]}
                        unit="em"
                    />
                </InspectorField>
            )}

            <InspectorField label={text.background}>
                <Switch
                    label={text.ownBackground}
                    checked={block.background ?? false}
                    onChange={(event) => onChange({ background: event.currentTarget.checked })}
                />
            </InspectorField>

            {block.background && (
                <>
                    <InspectorField label={text.backgroundColor}>
                        <ColorSwatches
                            label={text.blockBackgroundColor}
                            value={block.backgroundColor ?? BLOCK_DEFAULTS.backgroundColor}
                            onChange={(color) => color && onChange({ backgroundColor: color })}
                            swatches={BACKGROUND_SWATCHES}
                        />
                    </InspectorField>

                    <InspectorField label={text.backgroundRounding}>
                        <SliderControl
                            label={text.blockBackgroundRounding}
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

            <InspectorField label={text.padding}>
                <SliderControl
                    label={text.horizontalPadding}
                    value={block.paddingX ?? BLOCK_DEFAULTS.paddingX}
                    onChange={(paddingX) => onChange({ paddingX })}
                    min={0}
                    max={24}
                    marks={[]}
                    unit="px ↔"
                />
                <SliderControl
                    label={text.verticalPadding}
                    value={block.paddingY ?? BLOCK_DEFAULTS.paddingY}
                    onChange={(paddingY) => onChange({ paddingY })}
                    min={0}
                    max={24}
                    marks={[]}
                    unit="px ↕"
                />
            </InspectorField>

            <InspectorField label={text.offset}>
                <SliderControl
                    label={text.horizontalOffset}
                    value={block.offsetX ?? 0}
                    onChange={(offsetX) => onChange({ offsetX })}
                    min={-64}
                    max={64}
                    marks={[]}
                    unit="px →"
                />
                <SliderControl
                    label={text.verticalOffset}
                    value={block.offsetY ?? 0}
                    onChange={(offsetY) => onChange({ offsetY })}
                    min={-64}
                    max={64}
                    marks={[]}
                    unit="px ↓"
                />
                {(block.offsetX || block.offsetY) ? (
                    <Button variant="subtle" size="compact-xs" onClick={() => onChange({ offsetX: undefined, offsetY: undefined })}>
                        {text.resetOffset}
                    </Button>
                ) : null}
            </InspectorField>

            <InspectorField label={text.size}>
                <SizePresets layout={layout} block={block} onPick={(rect: CellRect) => onChange(rect)} />
                <p className="inspector-note">{text.sizeNote}</p>
            </InspectorField>

            {block.kind === "group" && (
                <Button
                    className="ungroup-block"
                    variant="default"
                    leftSection={<IconStackPop size={15} />}
                    onClick={onUngroup}
                    fullWidth
                >
                    {text.ungroup}
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
                {block.kind === "group" ? text.removeGroup : text.removeBlock}
            </Button>
        </div>
    );
}
