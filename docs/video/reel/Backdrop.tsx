import { AbsoluteFill, useCurrentFrame } from "remotion";
import { TOTAL_FRAMES } from "./timeline";

// Near black with two wide, barely coloured lights that drift across the whole film.
export function Backdrop()
{
    const frame = useCurrentFrame();
    const drift = frame / TOTAL_FRAMES;
    const coolX = 22 + drift * 30;
    const warmX = 82 - drift * 24;

    return (
        <AbsoluteFill
            style={{
                background: [
                    `radial-gradient(ellipse 70% 60% at ${coolX}% 18%, rgba(120, 138, 170, 0.13), transparent 70%)`,
                    `radial-gradient(ellipse 60% 55% at ${warmX}% 92%, rgba(70, 120, 92, 0.08), transparent 70%)`,
                    "radial-gradient(ellipse 120% 90% at 50% 50%, #0e0f12 0%, #08090b 60%, #050506 100%)",
                ].join(", "),
            }}
        />
    );
}
