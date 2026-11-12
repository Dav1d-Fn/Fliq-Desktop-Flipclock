import { useCallback, useState } from "react";
import { useAtomValue } from "jotai";
import { ATOMS } from "../settings/atoms";

// React key for the FlipClock. It changes only when the set of Tick.js views changes: other
// templates, other separators, another language (other month and day names), the second row
// switched on or off, or a length change reported by the clock itself.
//
// Colors, sizes, fonts and weather data are deliberately not part of it. They change CSS
// variables or plain text, and rebuilding Tick.js for them was the main cost of the old version.
export function useClockLayoutKey(): [string, () => void]
{
    const format = useAtomValue(ATOMS.TIME_FORMAT);
    const secondRowFormat = useAtomValue(ATOMS.SECOND_ROW_TIME_FORMAT);
    const separatorString = useAtomValue(ATOMS.SEPARATOR_STRING);
    const language = useAtomValue(ATOMS.LANGUAGE);
    const secondRowEnabled = useAtomValue(ATOMS.SECOND_ROW_ENABLED);
    const [rebuildCount, setRebuildCount] = useState(0);

    const requestRebuild = useCallback(() =>
    {
        setRebuildCount((count) => count + 1);
    }, []);

    const key = JSON.stringify([format, secondRowFormat, separatorString, language, secondRowEnabled, rebuildCount]);
    return [key, requestRebuild];
}
