import { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../Backdrop";
import { ARRIVE, mix, progress } from "../motion";

interface FeatureShotProps
{
    word: string;
    // Frame the shot is fully in (after its flap): the word lands there.
    landsAt: number;
    tilt?: number;
    children: ReactNode;
}

// One feature in two seconds: a big word and the real UI, tilted, drifting towards the viewer.
export function FeatureShot({ word, landsAt, tilt = -1, children }: FeatureShotProps)
{
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const drift = frame / durationInFrames;
    const wordIn = progress(frame, landsAt - 2, 9, ARRIVE);

    return (
        <AbsoluteFill>
            <Backdrop />
            <div
                style={{
                    position: "absolute",
                    top: 64,
                    left: 0,
                    right: 0,
                    textAlign: "center",
                    fontFamily: "Inter Variable",
                    fontWeight: 750,
                    fontSize: 104,
                    letterSpacing: "-0.045em",
                    color: "#f5f5f2",
                    opacity: wordIn,
                    filter: `blur(${(1 - wordIn) * 12}px)`,
                    translate: `0px ${(1 - wordIn) * 30}px`,
                }}
            >
                {word}
            </div>
            <AbsoluteFill
                style={{
                    top: 170,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 48,
                    transform: `perspective(2400px) rotateX(${mix(10, 4, drift)}deg) rotateY(${tilt * mix(12, 5, drift)}deg) scale(${mix(0.95, 1.03, drift)})`,
                }}
            >
                {children}
            </AbsoluteFill>
        </AbsoluteFill>
    );
}
