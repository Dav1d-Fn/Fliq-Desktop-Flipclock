import { createContext, useContext } from "react";
import { atom, type PrimitiveAtom } from "jotai";

// Natural height of every drawn block in px at scale 1, keyed by block id: what the block needs
// to show its content at full width. Written by ClockBlock, per window, never stored.
export const BLOCK_HEIGHTS = atom<Record<number, number>>({});

// How a GridClock below is drawn. The clock, ghost and editor use the defaults; a picture of
// another layout (saved layout thumbnails) gets its own block heights, so it never changes the
// rows of the clock being edited, and stands still: no timers, the time as it was when drawn.
export interface ClockPreview
{
    blockHeights: PrimitiveAtom<Record<number, number>>;
    frozen: boolean;
}

export const ClockPreviewContext = createContext<ClockPreview>({ blockHeights: BLOCK_HEIGHTS, frozen: false });

export function useClockPreview(): ClockPreview
{
    return useContext(ClockPreviewContext);
}
