import { useEffect, useRef, useState } from "react";
import FlipClock from "../../../clock/FlipClock";
import { useClockLayoutKey } from "../../../clock/useClockLayoutKey";

// Room kept free around the scaled clock inside the stage, in px.
const STAGE_MARGIN = 24;

// The real clock, built from the same settings, shrunk to fit above the settings page. Every
// change shows here exactly as it does on the desktop.
export function LivePreview()
{
    const [layoutKey, requestRebuild] = useClockLayoutKey();
    const stageRef = useRef<HTMLDivElement>(null);
    const clockRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    // A transform does not change the layout size the observer reports, so measuring the
    // unscaled clock and scaling it cannot feed back into itself.
    useEffect(() =>
    {
        const stage = stageRef.current;
        const clock = clockRef.current;
        if (!stage || !clock)
        {
            return;
        }

        const fit = () =>
        {
            const availableWidth = stage.clientWidth - STAGE_MARGIN;
            const availableHeight = stage.clientHeight - STAGE_MARGIN;
            const width = clock.offsetWidth;
            const height = clock.offsetHeight;
            if (width === 0 || height === 0)
            {
                return;
            }
            setScale(Math.min(1, availableWidth / width, availableHeight / height));
        };

        const observer = new ResizeObserver(fit);
        observer.observe(stage);
        observer.observe(clock);
        return () => observer.disconnect();
    }, []);

    return (
        <div className="live-preview">
            <div className="live-preview-head">
                <span className="live-preview-title">Live preview</span>
                <span>Changes apply instantly</span>
            </div>
            <div className="live-preview-stage" ref={stageRef}>
                <div className="live-preview-clock" ref={clockRef} style={{ transform: `scale(${scale})` }}>
                    <FlipClock key={layoutKey} onLayoutChange={requestRebuild} />
                </div>
            </div>
        </div>
    );
}
