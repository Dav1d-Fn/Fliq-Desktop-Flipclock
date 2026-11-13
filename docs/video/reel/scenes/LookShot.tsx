import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { mix } from "../motion";

export interface Look
{
    image: string;
    // Fills the frame behind the clock; matches the look's own box colour.
    background: string;
    width: number;
}

// One of the clock's looks, full frame, slowly pushing in.
export function LookShot({ look }: { look: Look })
{
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();

    return (
        <AbsoluteFill style={{ background: look.background, alignItems: "center", justifyContent: "center" }}>
            <Img
                src={staticFile(look.image)}
                style={{
                    width: look.width,
                    scale: `${mix(1, 1.07, frame / durationInFrames)}`,
                    filter: "drop-shadow(0 40px 90px rgba(0,0,0,0.35))",
                }}
            />
        </AbsoluteFill>
    );
}
