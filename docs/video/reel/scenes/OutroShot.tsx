import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../Backdrop";
import { reveal } from "../motion";
import { Lockup } from "./Lockup";

export function OutroShot({ startsAt }: { startsAt: number })
{
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const stay = durationInFrames + 30;
    const line = { fontFamily: "Inter Variable", letterSpacing: "-0.01em" };

    return (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <Backdrop />
            <Lockup appearsAt={0} unfoldAt={startsAt + 4} end={stay} size={160} />
            <div style={{ ...line, ...reveal(frame, startsAt + 30, stay, { arrive: 14 }), marginTop: 60, fontWeight: 650, fontSize: 52, color: "#f0f0ec" }}>
                Open source. Free.
            </div>
            <div style={{ ...line, ...reveal(frame, startsAt + 45, stay, { arrive: 14 }), marginTop: 16, fontWeight: 500, fontSize: 30, color: "#8d9097" }}>
                github.com/Dav1d-Fn/Fliq-Desktop-Flipclock
            </div>
        </AbsoluteFill>
    );
}
