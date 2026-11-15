import { atom, useAtomValue } from "jotai";
import { LayoutGrid, type ClockLayout } from "../layout/ClockLayout";

// Natural height of every drawn block in px at scale 1, keyed by block id: what the block needs
// to show its content at full width. Written by ClockBlock, per window, never stored.
export const BLOCK_HEIGHTS = atom<Record<number, number>>({});

// The grid of a layout with its rows as high as their blocks need. Clock, ghost and editor
// read positions through this, so they agree with what GridClock draws.
export function useLayoutGrid(layout: ClockLayout): LayoutGrid
{
    const blockHeights = useAtomValue(BLOCK_HEIGHTS);
    return new LayoutGrid(layout, LayoutGrid.autoRowHeights(layout, blockHeights));
}
