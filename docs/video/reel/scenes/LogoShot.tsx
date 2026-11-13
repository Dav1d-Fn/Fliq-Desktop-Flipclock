import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../Backdrop";
import { reveal } from "../motion";
import { Lockup } from "./Lockup";

export function LogoShot({ startsAt }: { startsAt: number })
{
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const stay = durationInFrames + 30;

    return (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40 }}>
            <Backdrop />
            <Lockup appearsAt={0} unfoldAt={startsAt + 2} end={stay} size={190} />
            <div style={{ ...reveal(frame, startsAt + 12, stay, { arrive: 14 }), fontFamily: "Inter Variable", fontWeight: 500, fontSize: 38, letterSpacing: "-0.01em", color: "#a2a4ab" }}>
                A flip clock for your desktop.
            </div>
        </AbsoluteFill>
    );
}
