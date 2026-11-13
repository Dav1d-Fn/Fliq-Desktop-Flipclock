import { useCurrentFrame } from "remotion";
import { FliqLogo } from "../FliqLogo";
import { ARRIVE, mix, progress, reveal } from "../motion";

interface LockupProps
{
    // Frame the mark appears.
    appearsAt?: number;
    // Frame the mark starts to slide aside and the name appears.
    unfoldAt: number;
    end: number;
    size?: number;
}

const NAME = "Fliq";

// The logo mark alone, then the name unfolding from behind it, letter by letter.
export function Lockup({ appearsAt = 0, unfoldAt, end, size = 170 }: LockupProps)
{
    const frame = useCurrentFrame();
    const mark = reveal(frame, appearsAt, end, { arrive: 10, lift: 0, blur: 14 });
    const markScale = mix(1.12, 1, progress(frame, appearsAt, 16));
    const unfold = progress(frame, unfoldAt, 18, ARRIVE);
    const nameWidth = size * 1.62;
    const gap = size * 0.24;
    const shift = (nameWidth + gap) / 2;

    return (
        <div style={{ position: "relative", display: "flex", alignItems: "center", height: size }}>
            <div style={{ ...mark, scale: `${markScale}`, translate: `${-shift * unfold}px 0px`, zIndex: 1 }}>
                <FliqLogo size={size} />
            </div>
            <div
                style={{
                    position: "absolute",
                    left: size / 2 - shift + size / 2 + gap,
                    width: nameWidth,
                    fontFamily: "Inter Variable",
                    fontWeight: 700,
                    fontSize: size * 0.86,
                    letterSpacing: "-0.045em",
                    color: "#f3f3f1",
                    lineHeight: 1,
                    display: "flex",
                }}
            >
                {NAME.split("").map((letter, index) => (
                    <span key={index} style={{ display: "inline-block", ...reveal(frame, unfoldAt + 2 + index * 2, end, { arrive: 10, lift: 0, blur: 12 }) }}>
                        {letter}
                    </span>
                ))}
            </div>
        </div>
    );
}
