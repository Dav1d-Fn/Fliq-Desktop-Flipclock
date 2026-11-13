import { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from "remotion";
import { FLIP } from "./timeline";

interface FlipShotProps
{
    // Frame the shot's flap lands (fully in) and the frame the next shot's flap has landed.
    lands: number;
    until: number;
    // How the shot comes in and goes out: a split-flap or a hard cut.
    enter?: "flip" | "cut";
    exit?: "flip" | "cut";
    flipFrames?: number;
    exitFlipFrames?: number;
    name?: string;
    children: ReactNode;
}

const HALF = { top: "inset(0 0 50% 0)", bottom: "inset(50% 0 0 0)" };
// Falls like a card: speeds up, then lands without bouncing back.
const FALL = Easing.bezier(0.55, 0, 0.9, 0.6);
const LAND = Easing.bezier(0.1, 0.4, 0.3, 1);

function Half({ part, children, style }: { part: "top" | "bottom"; children: ReactNode; style?: CSSProperties })
{
    return (
        <AbsoluteFill style={{ clipPath: HALF[part], transformOrigin: "50% 50%", backfaceVisibility: "hidden", ...style }}>
            {children}
        </AbsoluteFill>
    );
}

// Darkens a flap the further it is turned, like a card catching less light.
function shade(angle: number)
{
    return <AbsoluteFill style={{ background: "#000", opacity: Math.min(0.7, Math.abs(angle) / 90 * 0.7) }} />;
}

function FlipFrame({ length, enter, exit, flipFrames, exitFlipFrames, children }: Required<Omit<FlipShotProps, "lands" | "until" | "name">> & { length: number })
{
    const frame = useCurrentFrame();
    const local = frame - (enter === "flip" ? flipFrames : 0);

    // Coming in: the top half is already there under the old shot's falling flap; the bottom
    // half falls down over the old bottom half in the second half of the change.
    if (enter === "flip" && local < 0)
    {
        const progress = frame / flipFrames;
        const fall = interpolate(progress, [0.5, 1], [90, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: LAND });
        return (
            <AbsoluteFill>
                <Half part="top" style={{ zIndex: 1 }}>{children}</Half>
                {progress >= 0.5 && (
                    <Half part="bottom" style={{ zIndex: 3, transform: `perspective(2600px) rotateX(${fall}deg)` }}>
                        {children}
                        {shade(fall)}
                    </Half>
                )}
            </AbsoluteFill>
        );
    }

    // Going out: the bottom half stays until the new flap covers it; the top half falls away.
    if (exit === "flip" && local >= length)
    {
        const progress = (local - length) / exitFlipFrames;
        const fall = interpolate(progress, [0, 0.5], [0, -90], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: FALL });
        return (
            <AbsoluteFill>
                <Half part="bottom" style={{ zIndex: 1 }}>{children}</Half>
                {progress < 0.5 && (
                    <Half part="top" style={{ zIndex: 3, transform: `perspective(2600px) rotateX(${fall}deg)` }}>
                        {children}
                        {shade(fall)}
                    </Half>
                )}
            </AbsoluteFill>
        );
    }

    return <AbsoluteFill style={{ zIndex: 2 }}>{children}</AbsoluteFill>;
}

// One shot of the reel, placed so that its split-flap lands on `lands`. The halves are separate
// layers with z-indices (no stacking context around them), so the old shot's falling flap stays
// above the new shot's top half. Children count frames from the start of the incoming flap:
// the landing is their frame `flipFrames` (or 0 for a cut).
export function FlipShot({ lands, until, enter = "flip", exit = "flip", flipFrames = FLIP, exitFlipFrames = FLIP, name, children }: FlipShotProps)
{
    const start = lands - (enter === "flip" ? flipFrames : 0);
    const length = until - lands - (exit === "flip" ? exitFlipFrames : 0);
    const total = (enter === "flip" ? flipFrames : 0) + length + (exit === "flip" ? exitFlipFrames : 0);

    return (
        <Sequence from={start} durationInFrames={total} name={name}>
            <FlipFrame length={length} enter={enter} exit={exit} flipFrames={flipFrames} exitFlipFrames={exitFlipFrames}>
                {children}
            </FlipFrame>
        </Sequence>
    );
}
