import { AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { mix } from "../motion";
import { CLOCK_LANDS } from "../timeline";

interface HeroShotProps
{
    // Frame of this shot on which the music drops; the real flaps land there.
    dropAt: number;
}

// The real clock up close, tilted in space; its cards fall to 10:00 on the drop, the camera
// kicks in with them.
export function HeroShot({ dropAt }: HeroShotProps)
{
    const frame = useCurrentFrame();
    const kick = interpolate(frame, [dropAt - 2, dropAt + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
    const drift = frame / 90;
    const flash = frame < dropAt ? 0 : interpolate(frame, [dropAt, dropAt + 9], [0.28, 0], { extrapolateRight: "clamp" });
    // Dim until the drop, then the light comes up with it.
    const light = mix(0.55, 1, kick);

    return (
        <AbsoluteFill style={{ background: "#050506", overflow: "hidden" }}>
            <AbsoluteFill
                style={{
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [
                        "perspective(1800px)",
                        `translateX(${mix(160, 40, drift)}px)`,
                        `translateY(${mix(90, 60, kick)}px)`,
                        `rotateX(${mix(22, 12, kick)}deg)`,
                        `rotateY(${mix(-20, -10, kick)}deg)`,
                        `scale(${mix(0.86, 1.0, kick) + drift * 0.04})`,
                    ].join(" "),
                    filter: `brightness(${light})`,
                }}
            >
                <OffthreadVideo
                    src={staticFile("reel-clock.mp4")}
                    trimBefore={CLOCK_LANDS - dropAt}
                    muted
                    style={{ width: 3024 * 0.9, height: 1276 * 0.9, maxWidth: "none", borderRadius: 190 * 0.9 }}
                />
            </AbsoluteFill>
            <AbsoluteFill style={{ background: "radial-gradient(ellipse 140% 100% at 50% 50%, transparent 45%, rgba(0,0,0,0.7) 100%)" }} />
            <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
        </AbsoluteFill>
    );
}
