import { Img, staticFile, useCurrentFrame } from "remotion";
import { ScreenCrop } from "../ScreenCrop";
import { FeatureShot } from "./FeatureShot";

// reel-data.events.json: 12-hour clicked at 1.07 s, Fahrenheit at 4.3 s of the clip. The clip
// runs at 2x from 0.6 s, so the clock beside it switches on the frame each click lands.
const TRIM = 0.6;
const RATE = 2;
const at = (clipSeconds: number) => Math.round(((clipSeconds - TRIM) / RATE) * 30) + 2;

export function DataShot({ landsAt }: { landsAt: number })
{
    const frame = useCurrentFrame();
    const still = frame < at(1.07) ? "reel-clock-24c.png" : frame < at(4.3) ? "reel-clock-12c.png" : "reel-clock-12f.png";

    return (
        <FeatureShot word="12h. 24h. °C. °F." landsAt={landsAt}>
            <ScreenCrop clip="reel-data.mp4" crop={{ x: 450, y: 40, width: 600, height: 330 }} height={500} trimBefore={TRIM} playbackRate={RATE} />
            <Img src={staticFile(still)} style={{ width: 640, filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.5))" }} />
        </FeatureShot>
    );
}
