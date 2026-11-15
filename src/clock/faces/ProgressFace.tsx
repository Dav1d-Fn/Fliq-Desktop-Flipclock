import { useRef } from "react";
import type { ProgressMotion, ProgressUnit } from "../../layout/ClockLayout";
import { PROGRESS_DOT_COUNTS, progressShare } from "../ProgressShare";

interface ProgressFaceProps
{
    shape: "ring" | "dots";
    now: Date;
    unit: ProgressUnit;
    motion: ProgressMotion;
    member?: number;
}

const CENTER = 50;
const RING_RADIUS = 44;
const RING_WIDTH = 8;
const DOT_RADIUS = 3.2;
const DOTS_RADIUS = 44;

// A ring filling up, or dots around a circle lighting up in turn, over one unit (see
// progressShare). Smooth moves by a 1 s CSS transition (faces.css), never backwards: the jump
// back at the end of the unit is drawn without one.
export function ProgressFace({ shape, now, unit, motion, member }: ProgressFaceProps)
{
    const share = progressShare(now, unit, motion);
    const lastShare = useRef(share);
    const animated = motion === "smooth" && share >= lastShare.current;
    lastShare.current = share;
    const className = `clock-face face-progress${animated ? " animated" : ""}`;

    if (shape === "ring")
    {
        const length = 2 * Math.PI * RING_RADIUS;
        return (
            <svg className={className} data-member={member} viewBox="0 0 100 100">
                <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
                    <circle className="progress-track" cx={CENTER} cy={CENTER} r={RING_RADIUS} strokeWidth={RING_WIDTH} />
                    <circle
                        className="progress-fill"
                        cx={CENTER}
                        cy={CENTER}
                        r={RING_RADIUS}
                        strokeWidth={RING_WIDTH}
                        strokeDasharray={length}
                        strokeDashoffset={length * (1 - share)}
                    />
                </g>
            </svg>
        );
    }

    // Dot i is lit as far as the share has passed it: whole dots when stepped, the current one
    // fading in when smooth.
    const count = PROGRESS_DOT_COUNTS[unit];
    const filled = share * count;
    return (
        <svg className={className} data-member={member} viewBox="0 0 100 100">
            {Array.from({ length: count }, (_, index) =>
            {
                const radians = index * 2 * Math.PI / count;
                const lit = Math.min(1, Math.max(0, motion === "smooth" ? filled - index : Math.ceil(filled - index)));
                return (
                    <g key={index}>
                        <circle className="progress-dot-track" cx={CENTER + Math.sin(radians) * DOTS_RADIUS} cy={CENTER - Math.cos(radians) * DOTS_RADIUS} r={DOT_RADIUS} />
                        <circle
                            className="progress-dot"
                            cx={CENTER + Math.sin(radians) * DOTS_RADIUS}
                            cy={CENTER - Math.cos(radians) * DOTS_RADIUS}
                            r={DOT_RADIUS}
                            opacity={lit}
                        />
                    </g>
                );
            })}
        </svg>
    );
}
