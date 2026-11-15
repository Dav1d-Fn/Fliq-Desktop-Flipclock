import type { ReactNode } from "react";
import { Button, Select, SegmentedControl, Switch } from "@mantine/core";
import { IconAlignCenter, IconAlignLeft, IconAlignRight, IconStackPop, IconTrash } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { blockDefinition } from "../../../blocks/BlockRegistry";
import { settingsOf, type StyleSetting } from "../../../blocks/StyleSettings";
import { BLOCK_DEFAULTS, LayoutGrid, type BlockAlign, type CellRect, type ClockLayout, type LayoutBlock } from "../../../layout/ClockLayout";
import { named, useStrings } from "../../../i18n/useStrings";
import { ATOMS } from "../../../settings/atoms";
import { FONT_OPTIONS } from "../../../settings/options";
import { SliderControl } from "../controls/SliderControl";
import { BLOCK_EDITORS } from "./BlockEditors";
import { ColorSwatches } from "./ColorSwatches";
import { ContentEditor } from "./ContentEditor";
import { BACKGROUND_SWATCHES, TEXT_SWATCHES } from "./EditorSwatches";
import { ColorDot } from "./ColorDot";
import { InspectorField } from "./InspectorField";
import { InspectorSection } from "./InspectorSection";
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

// Settings the "Look" section holds (the kind's styleSettings); the rest live in Text.
const LOOK_SETTINGS: StyleSetting[] = ["cards", "glowColor", "dialColor", "handColor", "secondHandColor", "hourRingColor", "minuteRingColor", "secondRingColor", "labelSize", "progressColors"];

function fontLabel(font: string): string
{
    return FONT_OPTIONS.find((option) => option.value === font)?.label ?? font;
}

function joined(parts: (string | false | undefined)[]): string
{
    return parts.filter(Boolean).join(" · ");
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
    const Icon = editor.icon;
    const items = LayoutGrid.itemsOf(block);
    const showsIcons = items.some((item) => item.kind === "weather" && item.weatherIcon !== false);
    const hasLook = Boolean(StyleSettings) && (block.kind === "group" || showsIcons || LOOK_SETTINGS.some((setting) => settings.has(setting)));
    const hasText = ["align", "font", "color", "textSize", "size", "letterSpacing"].some((setting) => settings.has(setting as StyleSetting));

    // Summaries for closed sections.
    const displayOption = definition.displayOptions.find((option) => option.id === block.display);
    const displayLabel = block.display === "custom" ? strings.content.customFormat : displayOption && named(strings, displayOption.label);
    const contentSummary = joined([displayLabel, block.kind === "clock" && strings.clockStyle.names[block.clockStyle ?? "flip"]]);
    const textSummary = joined([
        settings.has("font") && fontLabel(block.font ?? defaultFont),
        (settings.has("textSize") || settings.has("size")) && `${block.textSize ?? 100} %`,
    ]);
    let lookSummary: ReactNode = undefined;
    if (settings.has("cards"))
    {
        lookSummary = <><ColorDot color={block.cardColor ?? BLOCK_DEFAULTS.cardColor} />{block.cardRadius ?? BLOCK_DEFAULTS.cardRadius} %</>;
    }
    else if (block.kind === "group")
    {
        lookSummary = block.direction === "column" ? strings.group.stacked : strings.group.sideBySide;
    }
    else if (showsIcons)
    {
        lookSummary = strings.iconStyle[block.iconStyle ?? "colored"];
    }
    const backgroundSummary = block.background
        ? <><ColorDot color={block.backgroundColor ?? BLOCK_DEFAULTS.backgroundColor} />{block.backgroundRadius ?? BLOCK_DEFAULTS.backgroundRadius} px</>
        : text.off;
    const offset = block.offsetX || block.offsetY ? text.offsetSummary(block.offsetX ?? 0, block.offsetY ?? 0) : undefined;
    const spacingSummary = joined([text.paddingSummary(block.padding ?? BLOCK_DEFAULTS.padding), offset]);

    return (
        <div className="inspector-body">
            <div className="inspector-block-heading">
                <span className="inspector-block-icon"><Icon size={18} /></span>
                <div>
                    <h2>{named(strings, definition.name)}</h2>
                    <span>{text.cells(block.w, block.h)}</span>
                </div>
            </div>

            {MemberSettings && <MemberSettings block={block} onChange={onChange} openMember={openMember} onOpenMember={onOpenMember} />}

            {block.kind !== "group" && (
                <InspectorSection id="content" title={text.sectionContent} summary={contentSummary} defaultOpen>
                    <ContentEditor block={block} onChange={onChange} />
                </InspectorSection>
            )}

            {hasText && (
                <InspectorSection id="text" title={settings.has("size") ? text.sectionSize : text.sectionText} summary={textSummary} defaultOpen>
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

                    {(settings.has("textSize") || settings.has("size")) && (
                        <InspectorField label={sizeLabel} help={settings.has("size") ? text.drawnSizeNote : text.textSizeNote}>
                            <SliderControl
                                label={sizeLabel}
                                value={block.textSize ?? 100}
                                onChange={(textSize) => onChange({ textSize })}
                                min={30}
                                max={250}
                                marks={[]}
                                unit="%"
                            />
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
                </InspectorSection>
            )}

            {hasLook && StyleSettings && (
                <InspectorSection id="look" title={text.sectionLook} summary={lookSummary} defaultOpen={block.kind === "group"}>
                    <StyleSettings block={block} onChange={onChange} />
                </InspectorSection>
            )}

            <InspectorSection id="background" title={text.background} summary={backgroundSummary} defaultOpen={false}>
                <Switch
                    mt={14}
                    label={text.ownBackground}
                    checked={block.background ?? false}
                    onChange={(event) => onChange({ background: event.currentTarget.checked })}
                />

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
            </InspectorSection>

            <InspectorSection id="spacing" title={text.sectionSpacing} summary={spacingSummary} defaultOpen={false}>
                <InspectorField label={text.size} help={text.sizeNote}>
                    <SizePresets layout={layout} block={block} onPick={(rect: CellRect) => onChange(rect)} />
                </InspectorField>

                <InspectorField label={text.padding}>
                    <SliderControl
                        label={text.blockPadding}
                        value={block.padding ?? BLOCK_DEFAULTS.padding}
                        onChange={(padding) => onChange({ padding })}
                        min={0}
                        max={24}
                        marks={[]}
                        unit="px"
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
            </InspectorSection>

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
