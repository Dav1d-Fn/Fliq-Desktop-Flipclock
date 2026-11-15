import type { ProgressMotion, ProgressUnit } from "../layout/ClockLayout.ts";

// Length of each unit in seconds, and of one step of it when stepped.
const UNIT_SECONDS: Record<ProgressUnit, number> = { minute: 60, hour: 3600, day: 86400 };
const STEP_SECONDS: Record<ProgressUnit, number> = { minute: 1, hour: 60, day: 60 };

// Dots of the dots shape: one per second, per five minutes, per hour.
export const PROGRESS_DOT_COUNTS: Record<ProgressUnit, number> = { minute: 60, hour: 12, day: 24 };

// Share (0..1] of the unit to show at `now`. Smooth: where it will be at the next full second,
// reached by a 1 s linear transition (the old seconds bar: full after second 59). Stepped:
// the current step counts as done, shown without a transition.
export function progressShare(now: Date, unit: ProgressUnit, motion: ProgressMotion): number
{
    const secondOfDay = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const position = secondOfDay % UNIT_SECONDS[unit];
    if (motion === "smooth")
    {
        return (position + 1) / UNIT_SECONDS[unit];
    }
    const step = STEP_SECONDS[unit];
    return (Math.floor(position / step) + 1) * step / UNIT_SECONDS[unit];
}
