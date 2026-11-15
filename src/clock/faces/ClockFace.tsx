import dayjs from "dayjs";
import type { ClockStyle } from "../../layout/ClockLayout";
import { AnalogFace } from "./AnalogFace";
import { DotMatrixFace } from "./DotMatrixFace";
import { NixieFace } from "./NixieFace";
import { RingsFace } from "./RingsFace";
import { SegmentFace } from "./SegmentFace";
import { useNow } from "./useNow";
import "./faces.css";

interface ClockFaceProps
{
    style: ClockStyle;
    // Day.js format of the time; "ss" in it turns on seconds.
    format: string;
    // Group member index, written as data-member (see Segment.member).
    member?: number;
}

// Every clock style besides flip and text. Sized in em, so BlockContent fits it to the block
// like text; colors come from CSS variables set by ClockBlock (see faces.css).
export function ClockFace({ style, format, member }: ClockFaceProps)
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
        case "rings":
            return <RingsFace now={now} label={dayjs(now).format(format.replace(/:ss?/, ""))} withSeconds={withSeconds} member={member} />;
        default:
            return <SegmentFace text={text} blinkOff={now.getSeconds() % 2 === 1} member={member} />;
    }
}
