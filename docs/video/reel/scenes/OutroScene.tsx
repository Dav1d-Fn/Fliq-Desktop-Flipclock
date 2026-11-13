import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { reveal } from "../motion";
import { Lockup } from "./Lockup";

export function OutroScene()
{
    const frame = useCurrentFrame();
    // Stays to the last frame: the end is the lockup, not black.
    const { durationInFrames } = useVideoConfig();
    const stay = durationInFrames + 30;
    const line = { fontFamily: "Inter Variable", letterSpacing: "-0.01em" };

    return (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <Lockup unfoldAt={12} end={stay} size={150} />
            <div style={{ ...line, ...reveal(frame, 34, stay), marginTop: 56, fontWeight: 600, fontSize: 40, color: "#e9e9e6" }}>
                Open source.
            </div>
            <div style={{ ...line, ...reveal(frame, 44, stay), marginTop: 14, fontWeight: 500, fontSize: 28, color: "#8d9097" }}>
                github.com/Dav1d-Fn/Fliq-Desktop-Flipclock
            </div>
        </AbsoluteFill>
    );
}
