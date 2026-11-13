import { CSSProperties } from "react";
import { OffthreadVideo, staticFile } from "remotion";

// The part of a recorded window to show, in CSS px of the 1280×800 editor window. The clips
// are recorded at 2x, so a crop can be shown up to twice its CSS size and stay sharp.
export interface Crop
{
    x: number;
    y: number;
    width: number;
    height: number;
}

interface ScreenCropProps
{
    clip: string;
    crop: Crop;
    // Shown height in px; the width follows the crop.
    height: number;
    // Seconds of the clip to skip, and its speed.
    trimBefore: number;
    playbackRate?: number;
    // Fades the top and bottom edge out, for crops that cut through a scrolling list.
    fadeEdges?: boolean;
    style?: CSSProperties;
}

const WINDOW = { width: 1280, height: 800 };

// A rounded card that shows one part of a recorded clip.
export function ScreenCrop({ clip, crop, height, trimBefore, playbackRate = 1, fadeEdges = false, style }: ScreenCropProps)
{
    const scale = height / crop.height;
    const edgeMask = fadeEdges ? "linear-gradient(to bottom, transparent 0, #000 70px, #000 calc(100% - 70px), transparent 100%)" : undefined;

    return (
        <div
            style={{
                position: "relative",
                width: crop.width * scale,
                height,
                overflow: "hidden",
                borderRadius: 18,
                background: "#f8f9fa",
                maskImage: edgeMask,
                boxShadow: "0 40px 120px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.08)",
                ...style,
            }}
        >
            <OffthreadVideo
                src={staticFile(clip)}
                trimBefore={Math.round(trimBefore * 30)}
                playbackRate={playbackRate}
                muted
                style={{
                    position: "absolute",
                    left: -crop.x * scale,
                    top: -crop.y * scale,
                    width: WINDOW.width * scale,
                    height: WINDOW.height * scale,
                    maxWidth: "none",
                }}
            />
        </div>
    );
}
