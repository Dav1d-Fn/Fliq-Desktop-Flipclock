import { useAtomValue } from "jotai";
import type { SegmentType } from "../../../clock/ClockTemplate";
import { ATOMS } from "../../../settings/atoms";
import { linesUsing } from "../FormatTokens";

interface UsageBadgeProps
{
    type: SegmentType;
}

// "Used in line 1" for a module page, or "Not used" when no line has its placeholder.
export function UsageBadge({ type }: UsageBadgeProps)
{
    const firstLine = useAtomValue(ATOMS.TIME_FORMAT);
    const secondLine = useAtomValue(ATOMS.SECOND_ROW_TIME_FORMAT);
    const secondLineShown = useAtomValue(ATOMS.SECOND_ROW_ENABLED);

    const lines = linesUsing(type, firstLine, secondLine, secondLineShown);
    if (lines.length === 0)
    {
        return <span className="usage-badge unused">Not used</span>;
    }

    const label = lines.length === 1 ? `Used in line ${lines[0]}` : `Used in lines ${lines.join(" & ")}`;
    return <span className="usage-badge">{label}</span>;
}
