import dayjs from "dayjs";
import { SegmentedControl } from "@mantine/core";
import { withClockStyle, withTextStyle } from "../../../../blocks/StyleSettings";
import { ClockFace } from "../../../../clock/faces/ClockFace";
import type { ClockStyle, LayoutBlock, ProgressMotion, ProgressShape, ProgressUnit, TextStyle } from "../../../../layout/ClockLayout";
import { useStrings } from "../../../../i18n/useStrings";
import type { BlockSettingsProps } from "../BlockEditors";
import { InspectorField } from "../InspectorField";
import { FlipUnitControl } from "./FlipUnitControl";
import { StyleTiles, type StyleTile } from "./StyleTiles";
import { TextStylePreview } from "./TextStylePreview";

// Picker order: the text styles the digits can have, then the faces only a clock has.
export const TEXT_STYLES: TextStyle[] = ["flip", "text", "segment", "dots", "nixie"];
const CLOCK_FACES: Exclude<ClockStyle, "digital">[] = ["analogMinimal", "analogClassic", "analogFine", "rings", "progress"];

// Round faces are as high as they are wide and the row follows (see ClockBlock), so a wider
// block would make a huge clock: picking one narrows the block to this many columns.
const ROUND_MAX_COLUMNS = 2;

function isRound(style: string): boolean
{
    return style.startsWith("analog") || style === "rings";
}

// Narrows a block to ROUND_MAX_COLUMNS when it gets a round look.
function narrowed(block: LayoutBlock, round: boolean): Partial<LayoutBlock>
{
    return round && block.w > ROUND_MAX_COLUMNS ? { w: ROUND_MAX_COLUMNS } : {};
}

// A small picture of a clock face: the real face, or the progress bar.
function FacePreview({ face }: { face: Exclude<ClockStyle, "digital"> })
{
    if (face === "progress")
    {
        return (
            <span className="style-preview-bar">
                <i style={{ width: `${(dayjs().second() + 1) / 60 * 100}%` }} />
            </span>
        );
    }
    return <ClockFace style={face} format={isRound(face) ? "HH:mm:ss" : "HH:mm"} />;
}

// How the clock is drawn, as a grid of live previews: digits in one of the text styles, or a
// face. A clock in a group has one "Digital" tile instead, drawn in the group's text style
// (a group has one text style, see TextStylePicker).
export function ClockStylePicker({ block, onChange, inGroup }: BlockSettingsProps)
{
    const text = useStrings().clockStyle;
    const face = block.clockStyle ?? "digital";
    const textStyle = block.textStyle ?? "text";
    const time = dayjs().format("HH:mm");
    let current: string = face;
    if (face === "digital" && !inGroup)
    {
        current = textStyle;
    }

    const textTiles: StyleTile[] = inGroup
        ? [{ id: "digital", name: text.names.digital, preview: <TextStylePreview style={textStyle} text={time} /> }]
        : TEXT_STYLES.map((style) => ({ id: style, name: text.names[style], preview: <TextStylePreview style={style} text={time} /> }));
    const faceTiles: StyleTile[] = CLOCK_FACES.map((clockFace) => ({
        id: clockFace,
        name: text.names[clockFace],
        round: isRound(clockFace),
        preview: <FacePreview face={clockFace} />,
    }));

    // One change, so one undo step brings back the old style with its colors.
    function pick(id: string)
    {
        if (id === current)
        {
            return;
        }
        if (id === "digital")
        {
            onChange(withClockStyle("digital"));
        }
        else if ((CLOCK_FACES as string[]).includes(id))
        {
            onChange({ ...withClockStyle(id as ClockStyle), ...narrowed(block, isRound(id)) });
        }
        else
        {
            onChange(withTextStyle(block, id as TextStyle));
        }
    }

    let help: string | undefined = undefined;
    if (inGroup)
    {
        help = text.memberNote;
    }
    else if (isRound(face))
    {
        help = text.secondsNote;
    }

    return (
        <InspectorField label={text.label} help={help}>
            <StyleTiles label={text.label} tiles={[...textTiles, ...faceTiles]} current={current} block={block} onPick={pick} />
            {current === "flip" && <FlipUnitControl block={block} onChange={onChange} />}
            {current === "progress" && <ProgressOptions block={block} onChange={onChange} />}
        </InspectorField>
    );
}

// Shape, unit and motion of the progress style. Unset is the old seconds bar.
function ProgressOptions({ block, onChange }: BlockSettingsProps)
{
    const text = useStrings().progress;
    return (
        <div className="progress-options">
            <span className="progress-option-label">{text.shape}</span>
            <SegmentedControl
                fullWidth
                size="xs"
                data={[{ value: "bar", label: text.bar }, { value: "ring", label: text.ring }, { value: "dots", label: text.dots }]}
                value={block.progressShape ?? "bar"}
                onChange={(shape) => onChange({ progressShape: shape as ProgressShape, ...narrowed(block, shape !== "bar") })}
            />
            <span className="progress-option-label">{text.unit}</span>
            <SegmentedControl
                fullWidth
                size="xs"
                data={[{ value: "minute", label: text.minute }, { value: "hour", label: text.hour }, { value: "day", label: text.day }]}
                value={block.progressUnit ?? "minute"}
                onChange={(unit) => onChange({ progressUnit: unit as ProgressUnit })}
            />
            <span className="progress-option-label">{text.motion}</span>
            <SegmentedControl
                fullWidth
                size="xs"
                data={[{ value: "smooth", label: text.smooth }, { value: "stepped", label: text.stepped }]}
                value={block.progressMotion ?? "smooth"}
                onChange={(motion) => onChange({ progressMotion: motion as ProgressMotion })}
            />
        </div>
    );
}
