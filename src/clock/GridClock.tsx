// The two bundled fonts of FONT_OPTIONS, loaded wherever a clock is drawn. Without them the
// clock window fell back to another font while the editor (which loads them) showed the right one.
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import { CSSProperties, ReactNode } from "react";
import { useAtomValue } from "jotai";
import dayjs from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/de";
import "dayjs/locale/fr";
import "dayjs/locale/es";
import "dayjs/locale/it";
import "dayjs/locale/ru";
import "dayjs/locale/zh";
import "dayjs/locale/ja";
import "dayjs/locale/sv";
import "dayjs/locale/pl";
import { LayoutGrid, type ClockLayout, type LayoutBlock, type PixelRect } from "../layout/ClockLayout";
import { ATOMS } from "../settings/atoms";
import { ClockBlock } from "./ClockBlock";

interface GridClockProps
{
    layout: ClockLayout;
    // 1 = the editor's cell size (64 x 56 px).
    scale: number;
    // Editor only: where each block is drawn while dragged, and extra style per block.
    blockRect?: (block: LayoutBlock) => PixelRect;
    blockStyle?: (block: LayoutBlock) => CSSProperties | undefined;
    // Editor only, in grid coordinates: drawn below the blocks (grid cells) and on top of them
    // (snap ghost, hit boxes, handles).
    underlay?: ReactNode;
    overlay?: ReactNode;
    style?: CSSProperties;
}

// The clock: a box with the whole-clock look, and the blocks of the layout on a grid inside.
// Used by the clock window, the ghost windows and the layout editor alike.
export default function GridClock({ layout, scale, blockRect, blockStyle, underlay, overlay, style }: GridClockProps)
{
    const language = useAtomValue(ATOMS.LANGUAGE);
    const background = useAtomValue(ATOMS.BOX_BACKGROUND);
    const cornerRadius = useAtomValue(ATOMS.CLOCK_CORNER_RADIUS);
    const padding = useAtomValue(ATOMS.CLOCK_PADDING);
    const textFont = useAtomValue(ATOMS.TEXT_FONT);
    const textColor = useAtomValue(ATOMS.TEXT_COLOR);

    // Before the time spans render, they are formatted with it.
    dayjs.locale(language);

    const grid = new LayoutGrid(layout);
    const gridSize = grid.size(scale);

    const containerStyle = {
        padding: padding * scale,
        backgroundColor: background,
        borderRadius: cornerRadius * scale,
        "--text-color": textColor,
        "--text-font": textFont,
        ...style,
    } as CSSProperties;

    return (
        <div id="flipclock-container" style={containerStyle}>
            <div style={{ position: "relative", width: gridSize.width, height: gridSize.height }}>
                {underlay}
                {layout.blocks.map((block) => (
                    <ClockBlock
                        key={block.id}
                        block={block}
                        rect={blockRect?.(block) ?? grid.pixelRect(block, scale)}
                        scale={scale}
                        language={language}
                        style={blockStyle?.(block)}
                    />
                ))}
                {overlay}
            </div>
        </div>
    );
}
