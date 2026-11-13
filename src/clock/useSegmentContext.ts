import { useAtomValue } from "jotai";
import type { SegmentContext } from "../blocks/BlockDefinition";
import { ATOMS } from "../settings/atoms";

// The global settings BlockDefinition.segments needs (Data › Time).
export function useSegmentContext(): SegmentContext
{
    const hourCycle = useAtomValue(ATOMS.HOUR_CYCLE);
    const hourLeadingZero = useAtomValue(ATOMS.HOUR_LEADING_ZERO);
    return { hourCycle, hourLeadingZero };
}
