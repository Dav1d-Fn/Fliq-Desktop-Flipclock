import "@fontsource-variable/inter";
import { Composition } from "remotion";
import { Showreel } from "./Showreel";
import { FPS, TOTAL_FRAMES } from "./timeline";

export function ReelRoot()
{
    return (
        <Composition
            id="Showreel"
            component={Showreel}
            durationInFrames={TOTAL_FRAMES}
            fps={FPS}
            width={1920}
            height={1080}
        />
    );
}
