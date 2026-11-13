import { AbsoluteFill, Audio, interpolate, staticFile } from "remotion";
import { FlipShot } from "./FlipShot";
import { ScreenCrop } from "./ScreenCrop";
import { DataShot } from "./scenes/DataShot";
import { FeatureShot } from "./scenes/FeatureShot";
import { HeroShot } from "./scenes/HeroShot";
import { Look, LookShot } from "./scenes/LookShot";
import { LogoShot } from "./scenes/LogoShot";
import { OutroShot } from "./scenes/OutroShot";
import { DROP, FLIP, MUSIC_TRIM, QUICK_FLIP, seconds, SHOTS, TOTAL_FRAMES } from "./timeline";

// Stills from record.mjs (scene reel-looks), each on a field of its own box colour.
const LOOKS: Look[] = [
    { image: "look-classic.png", background: "#0b0b0c", width: 1500 },
    { image: "look-mint.png", background: "#0b1d12", width: 1500 },
    { image: "look-paper.png", background: "#e3dfd6", width: 1500 },
    { image: "look-amber.png", background: "#140e05", width: 1500 },
    { image: "look-ocean.png", background: "#081528", width: 1720 },
];

// Crops are in CSS px of the 1280×800 settings window (see record.mjs). Each clip runs faster
// than recorded and starts where its action does; children count frames from their flap's start.
const EDITOR = { landsAt: FLIP };

export function Showreel()
{
    return (
        <AbsoluteFill style={{ background: "#08090b" }}>
            {SHOTS.looks.map((time, index) => (
                <FlipShot key={index} {...time} enter={index === 0 ? "cut" : "flip"} name={`Look ${index + 1}`}>
                    <LookShot look={LOOKS[index]} />
                </FlipShot>
            ))}

            <FlipShot {...SHOTS.hero} name="Hero">
                <HeroShot dropAt={DROP - (SHOTS.hero.lands - FLIP)} />
            </FlipShot>

            <FlipShot {...SHOTS.logo} name="Logo"><LogoShot startsAt={FLIP} /></FlipShot>

            <FlipShot {...SHOTS.layout} name="Layout">
                <FeatureShot word="Build any layout." {...EDITOR}>
                    <ScreenCrop clip="reel-add.mp4" crop={{ x: 250, y: 180, width: 690, height: 610 }} height={680} trimBefore={1.9} playbackRate={1.5} />
                </FeatureShot>
            </FlipShot>

            <FlipShot {...SHOTS.group} name="Group">
                <FeatureShot word="Group." tilt={1} {...EDITOR}>
                    <ScreenCrop clip="reel-group.mp4" crop={{ x: 420, y: 295, width: 440, height: 330 }} height={660} trimBefore={0.7} playbackRate={1.8} />
                </FeatureShot>
            </FlipShot>

            <FlipShot {...SHOTS.style} name="Style">
                <FeatureShot word="Style." {...EDITOR}>
                    <ScreenCrop clip="reel-style.mp4" crop={{ x: 420, y: 295, width: 450, height: 250 }} height={460} trimBefore={2.9} playbackRate={1.6} />
                    <ScreenCrop clip="reel-style.mp4" crop={{ x: 975, y: 90, width: 305, height: 690 }} height={680} trimBefore={2.9} playbackRate={1.6} fadeEdges />
                </FeatureShot>
            </FlipShot>

            <FlipShot {...SHOTS.undo} name="Undo">
                <FeatureShot word="Undo." tilt={1} {...EDITOR}>
                    <ScreenCrop clip="reel-grid.mp4" crop={{ x: 390, y: 175, width: 500, height: 360 }} height={600} trimBefore={6.4} playbackRate={1.5} />
                    <ScreenCrop clip="reel-grid.mp4" crop={{ x: 738, y: 118, width: 70, height: 32 }} height={96} trimBefore={6.4} playbackRate={1.5} style={{ borderRadius: 18 }} />
                </FeatureShot>
            </FlipShot>

            <FlipShot {...SHOTS.data} name="Data"><DataShot {...EDITOR} /></FlipShot>

            {SHOTS.quickLooks.map((time, index) => (
                <FlipShot key={index} {...time} flipFrames={QUICK_FLIP} exitFlipFrames={index === SHOTS.quickLooks.length - 1 ? FLIP : QUICK_FLIP} name={`Quick look ${index + 1}`}>
                    <LookShot look={LOOKS[(index + 1) % LOOKS.length]} />
                </FlipShot>
            ))}

            <FlipShot {...SHOTS.outro} exit="cut" name="Outro"><OutroShot startsAt={FLIP} /></FlipShot>

            {/* "The Glide Path" from 10.1 s, so its drop lands on the real flip; faded out at the end. */}
            <Audio
                src={staticFile("the-glide-path.mp3")}
                trimBefore={MUSIC_TRIM}
                volume={(frame) => interpolate(frame, [TOTAL_FRAMES - seconds(2.5), TOTAL_FRAMES - 3], [1, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                })}
            />
        </AbsoluteFill>
    );
}
