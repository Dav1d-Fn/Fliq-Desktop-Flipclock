import { useAtomValue } from "jotai";
import { LayoutGrid, type ClockLayout } from "../layout/ClockLayout";
import { useClockPreview } from "./ClockPreview";

export { BLOCK_HEIGHTS } from "./ClockPreview";

// The grid of a layout with its rows as high as their blocks need. Clock, ghost and editor
// read positions through this, so they agree with what GridClock draws.
export function useLayoutGrid(layout: ClockLayout): LayoutGrid
{
    const blockHeights = useAtomValue(useClockPreview().blockHeights);
    return new LayoutGrid(layout, LayoutGrid.autoRowHeights(layout, blockHeights));
}
