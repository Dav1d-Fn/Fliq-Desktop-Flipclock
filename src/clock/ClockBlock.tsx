import { CSSProperties, useMemo, useState } from "react";
import { blockDefinition } from "../blocks/BlockRegistry";
import { BLOCK_DEFAULTS, type LayoutBlock, type PixelRect } from "../layout/ClockLayout";
import { BlockContent } from "./BlockContent";
import { useSegmentContext } from "./useSegmentContext";

interface ClockBlockProps
{
    block: LayoutBlock;
    rect: PixelRect;
    scale: number;
    language: string;
    // Extra style from the editor (lift, transitions, animations).
    style?: CSSProperties;
}

// Width of a Tick.js flip card in em (its min-width); card rounding is a percentage of it.
const FLIP_CARD_WIDTH_EM = 1.125;

// Least room above and below the content, in px at scale 1. Vertically a block gets half its
// padding, at least this, so wide flip blocks (limited by their height) react to padding too.
const MIN_VERTICAL_PADDING = 4;

const JUSTIFY: Record<string, CSSProperties["justifyContent"]> = {
    left: "flex-start",
    center: "center",
    right: "flex-end",
};

// One block of the grid: its box, colors and font, and the content inside.
export function ClockBlock({ block, rect, scale, language, style }: ClockBlockProps)
{
    const definition = blockDefinition(block.kind);
    const segments = definition.segments(block, useSegmentContext());
    const segmentsKey = JSON.stringify(segments);
    // A stable array per content, so BlockContent's template is only rebuilt when it changes.
    const stableSegments = useMemo(() => segments, [segmentsKey]);
    const [rebuildCount, setRebuildCount] = useState(0);

    const padding = (block.padding ?? BLOCK_DEFAULTS.padding) * scale;
    const cardRadius = block.cardRadius ?? BLOCK_DEFAULTS.cardRadius;
    const align = definition.alignable ? block.align ?? BLOCK_DEFAULTS.align : "center";

    // Unset color and font fall back to the clock defaults set on the container.
    const blockStyle = {
        position: "absolute",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        boxSizing: "border-box",
        padding: `${Math.max(MIN_VERTICAL_PADDING * scale, padding / 2)}px ${padding}px`,
        display: "flex",
        ...(block.color && { "--text-color": block.color }),
        ...(block.font && { "--text-font": block.font }),
        "--flipcard-bg-color": block.cardColor ?? BLOCK_DEFAULTS.cardColor,
        "--flipcard-rounded": `${cardRadius / 100 * FLIP_CARD_WIDTH_EM}em`,
        "--letter-spacing": `${block.letterSpacing ?? 0}em`,
        translate: `${(block.offsetX ?? 0) * scale}px ${(block.offsetY ?? 0) * scale}px`,
        ...(block.background && {
            backgroundColor: block.backgroundColor ?? BLOCK_DEFAULTS.backgroundColor,
            borderRadius: (block.backgroundRadius ?? BLOCK_DEFAULTS.backgroundRadius) * scale,
        }),
        ...style,
    } as CSSProperties;

    // A new segment list or language means other Tick.js views: remount the content.
    const contentKey = `${segmentsKey}|${language}|${rebuildCount}`;

    return (
        <div className="clock-block" data-block-id={block.id} style={blockStyle}>
            <BlockContent
                key={contentKey}
                segments={stableSegments}
                justify={JUSTIFY[align]}
                sizeShare={(block.textSize ?? 100) / 100}
                onLayoutChange={() => setRebuildCount((count) => count + 1)}
            />
        </div>
    );
}
