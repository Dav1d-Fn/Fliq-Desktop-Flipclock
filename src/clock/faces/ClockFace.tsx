import dayjs from "dayjs";
import type { ProgressMotion, ProgressUnit } from "../../layout/ClockLayout";
import type { FaceStyle } from "../ClockTemplate";
import { AnalogFace } from "./AnalogFace";
import { DotMatrixFace } from "./DotMatrixFace";
import { NixieFace } from "./NixieFace";
import { ProgressFace } from "./ProgressFace";
import { RingsFace } from "./RingsFace";
import { SegmentFace } from "./SegmentFace";
import { useNow } from "./useNow";
import "./faces.css";

interface ClockFaceProps
{
    style: FaceStyle;
    // Day.js format of the time; "ss" in it turns on seconds. Unused by progress.
    format: string;
    // Progress only.
    unit?: ProgressUnit;
    motion?: ProgressMotion;
    // Group member index, written as data-member (see Segment.member).
    member?: number;
}

// Every clock style besides flip, text and the progress bar. Sized in em, so BlockContent fits it to the block
// like text; colors come from CSS variables set by ClockBlock (see faces.css).
export function ClockFace({ style, format, unit = "minute", motion = "smooth", member }: ClockFaceProps)
{
    const now = useNow();
    const withSeconds = format.includes("s");
    const text = dayjs(now).format(format);

    switch (style)
    {
        case "dots":
            return <DotMatrixFace text={text} member={member} />;
        case "nixie":
            return <NixieFace text={text} member={member} />;
        case "analogMinimal":
        case "analogClassic":
        case "analogFine":
            return <AnalogFace variant={style} now={now} withSeconds={withSeconds} member={member} />;
        case "progressRing":
            return <ProgressFace shape="ring" now={now} unit={unit} motion={motion} member={member} />;
        case "progressDots":
            return <ProgressFace shape="dots" now={now} unit={unit} motion={motion} member={member} />;
        case "rings":
            return <RingsFace now={now} label={dayjs(now).format(format.replace(/:ss?/, ""))} withSeconds={withSeconds} member={member} />;
        default:
            return <SegmentFace text={text} blinkOff={now.getSeconds() % 2 === 1} member={member} />;
    }
}
