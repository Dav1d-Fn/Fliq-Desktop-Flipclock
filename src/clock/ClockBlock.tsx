import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useSetAtom } from "jotai";
import { blockDefinition } from "../blocks/BlockRegistry";
import { BLOCK_DEFAULTS, isProgressBar, type LayoutBlock, type PixelRect, type RowAlign } from "../layout/ClockLayout";
import { BlockContent } from "./BlockContent";
import { useClockPreview } from "./ClockPreview";
import { useSegmentContext } from "./useSegmentContext";

interface ClockBlockProps
{
    block: LayoutBlock;
    rect: PixelRect;
    scale: number;
    rowAlign: RowAlign;
    language: string;
    // Extra style from the editor (lift, transitions, animations).
    style?: CSSProperties;
}

// Width of a Tick.js flip card in em (its min-width); card rounding is a percentage of it.
const FLIP_CARD_WIDTH_EM = 1.125;

// Least room above and below the content, in px at scale 1. Vertically a block gets half its
// padding, at least this, so wide flip blocks (limited by their height) react to padding too.
const MIN_VERTICAL_PADDING = 4;

// Natural heights closer than this (px at scale 1) count as the same, so rounding in the
// measurement cannot make rows twitch.
const HEIGHT_TOLERANCE = 0.5;

const JUSTIFY: Record<string, CSSProperties["justifyContent"]> = {
    left: "flex-start",
    center: "center",
    right: "flex-end",
};

const ROW_ALIGN_ITEMS: Record<RowAlign, CSSProperties["alignItems"]> = {
    top: "flex-start",
    center: "center",
    bottom: "flex-end",
};

// One block of the grid: its box, colors and font, and the content inside.
export function ClockBlock({ block, rect, scale, rowAlign, language, style }: ClockBlockProps)
{
    const definition = blockDefinition(block.kind);
    const segments = definition.segments(block, useSegmentContext());
    const segmentsKey = JSON.stringify(segments);
    // A stable array per content, so BlockContent's template is only rebuilt when it changes.
    const stableSegments = useMemo(() => segments, [segmentsKey]);
    const [rebuildCount, setRebuildCount] = useState(0);
    // Content height per px of content width, measured by BlockContent (null until then).
    const [heightPerWidth, setHeightPerWidth] = useState<number | null>(null);
    const setBlockHeights = useSetAtom(useClockPreview().blockHeights);

    const padding = (block.padding ?? BLOCK_DEFAULTS.padding) * scale;
    const cardRadius = block.cardRadius ?? BLOCK_DEFAULTS.cardRadius;
    const sizeShare = (block.textSize ?? 100) / 100;
    const align = definition.alignable ? block.align ?? BLOCK_DEFAULTS.align : "center";
    const verticalPadding = Math.max(MIN_VERTICAL_PADDING * scale, padding / 2);
    const barThickness = block.barThickness ?? BLOCK_DEFAULTS.barThickness;

    // What the block needs at its width, in px at scale 1: its row is as high as the highest.
    // A progress bar needs its thickness, everything else its content fitted to the width at
    // its text size, so a smaller text size also makes the row lower.
    const contentWidth = (rect.width - 2 * padding) / scale;
    let contentHeight: number | null = null;
    if (isProgressBar(block))
    {
        contentHeight = barThickness;
    }
    else if (heightPerWidth !== null && contentWidth > 0)
    {
        contentHeight = contentWidth * heightPerWidth * sizeShare;
    }
    const naturalHeight = contentHeight === null ? null : contentHeight + 2 * verticalPadding / scale;

    useEffect(() =>
    {
        if (naturalHeight === null)
        {
            return;
        }
        setBlockHeights((heights) =>
        {
            const known = heights[block.id];
            if (known !== undefined && Math.abs(known - naturalHeight) < HEIGHT_TOLERANCE)
            {
                return heights;
            }
            return { ...heights, [block.id]: naturalHeight };
        });
    }, [block.id, naturalHeight, setBlockHeights]);

    // Unset color and font fall back to the clock defaults set on the container.
    const blockStyle = {
        position: "absolute",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        boxSizing: "border-box",
        padding: `${verticalPadding}px ${padding}px`,
        display: "flex",
        ...(block.color && { "--text-color": block.color }),
        ...(block.font && { "--text-font": block.font }),
        "--flipcard-bg-color": block.cardColor ?? BLOCK_DEFAULTS.cardColor,
        "--flipcard-rounded": `${cardRadius / 100 * FLIP_CARD_WIDTH_EM}em`,
        "--letter-spacing": `${block.letterSpacing ?? 0}em`,
        // Clock face colors; unset leaves each style's own (see faces.css).
        ...(block.glowColor && { "--glow-color": block.glowColor }),
        ...(block.dialColor && { "--dial-color": block.dialColor }),
        ...(block.handColor && { "--hand-color": block.handColor }),
        ...(block.secondHandColor && { "--second-hand-color": block.secondHandColor }),
        ...(block.hourRingColor && { "--hour-ring-color": block.hourRingColor }),
        ...(block.minuteRingColor && { "--minute-ring-color": block.minuteRingColor }),
        ...(block.secondRingColor && { "--second-ring-color": block.secondRingColor }),
        "--label-size": (block.labelSize ?? 100) / 100,
        translate: `${(block.offsetX ?? 0) * scale}px ${(block.offsetY ?? 0) * scale}px`,
        // Progress colors (bar, ring, dots, also in groups) and the bar's size.
        "--bar-color": block.barColor ?? "var(--text-color)",
        "--bar-track-color": block.barTrackColor ?? BLOCK_DEFAULTS.barTrackColor,
        "--bar-thickness": `${barThickness * scale}px`,
        "--bar-radius": `${(block.barRadius ?? BLOCK_DEFAULTS.barRadius) * scale}px`,
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
                alignItems={ROW_ALIGN_ITEMS[rowAlign]}
                sizeShare={sizeShare}
                iconStyle={block.iconStyle ?? "colored"}
                onLayoutChange={() => setRebuildCount((count) => count + 1)}
                onMeasure={setHeightPerWidth}
            />
        </div>
    );
}
