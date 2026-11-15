import { useMemo } from "react";
import { atom, useAtomValue } from "jotai";
import GridClock from "../../../clock/GridClock";
import { ClockPreviewContext, type ClockPreview } from "../../../clock/ClockPreview";
import { useLayoutGrid } from "../../../clock/useLayoutGrid";
import type { ClockLayout } from "../../../layout/ClockLayout";
import { ATOMS } from "../../../settings/atoms";
import { LayoutSchematic } from "./LayoutSchematic";
import { ThumbnailBoundary } from "./ThumbnailBoundary";

interface LayoutThumbnailProps
{
    layout: ClockLayout;
    // Room for the picture in px; the clock keeps its proportions inside it.
    width: number;
    height: number;
}

// A small picture of a layout: the real clock with the current look and weather, standing
// still (no timers), scaled down to fit. The schematic grid if it cannot be drawn.
export function LayoutThumbnail({ layout, width, height }: LayoutThumbnailProps)
{
    // Its own block heights, so measuring this clock never moves the rows of the one being edited.
    const preview = useMemo<ClockPreview>(() => ({ blockHeights: atom<Record<number, number>>({}), frozen: true }), []);

    return (
        <ThumbnailBoundary fallback={<LayoutSchematic layout={layout} size={height} />}>
            <ClockPreviewContext.Provider value={preview}>
                <ScaledClock layout={layout} width={width} height={height} />
            </ClockPreviewContext.Provider>
        </ThumbnailBoundary>
    );
}

// Draws the clock at full size and shrinks it with a transform: drawn small, its text would
// hit the minimum font size and spill out of the blocks.
function ScaledClock({ layout, width, height }: LayoutThumbnailProps)
{
    const padding = useAtomValue(ATOMS.CLOCK_PADDING);
    const gridSize = useLayoutGrid(layout).size(1);
    const naturalWidth = gridSize.width + 2 * padding;
    const naturalHeight = gridSize.height + 2 * padding;
    const scale = Math.min(width / naturalWidth, height / naturalHeight);

    return (
        <span className="layout-thumbnail" aria-hidden="true" style={{ width: naturalWidth * scale, height: naturalHeight * scale }}>
            <span className="layout-thumbnail-clock" style={{ width: naturalWidth, transform: `scale(${scale})` }}>
                <GridClock layout={layout} scale={1} />
            </span>
        </span>
    );
}
