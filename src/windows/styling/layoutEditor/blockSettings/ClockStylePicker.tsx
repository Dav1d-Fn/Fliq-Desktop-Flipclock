import dayjs from "dayjs";
import { SegmentedControl, UnstyledButton } from "@mantine/core";
import { useAtomValue } from "jotai";
import { ClockFace } from "../../../../clock/faces/ClockFace";
import type { ClockStyle, LayoutBlock, ProgressMotion, ProgressShape, ProgressUnit } from "../../../../layout/ClockLayout";
import { useStrings } from "../../../../i18n/useStrings";
import { ATOMS } from "../../../../settings/atoms";
import type { BlockSettingsProps } from "../BlockEditors";
import { InspectorField } from "../InspectorField";

// Picker order.
const CLOCK_STYLES: ClockStyle[] = ["flip", "text", "segment", "dots", "nixie", "analogMinimal", "analogClassic", "analogFine", "rings", "progress"];

// Round faces are as high as they are wide and the row follows (see ClockBlock), so a wider
// block would make a huge clock: picking one narrows the block to this many columns.
const ROUND_MAX_COLUMNS = 2;

// Size of the previews, in px (the faces are sized in em): round faces fill the preview's
// height, digits stay small enough for their width.
const ROUND_PREVIEW_SIZE = 44;
const DIGITS_PREVIEW_SIZE = 18;

function isRound(style: ClockStyle): boolean
{
    return style.startsWith("analog") || style === "rings";
}

// Narrows a block to ROUND_MAX_COLUMNS when it gets a round look.
function narrowed(block: LayoutBlock, round: boolean): Partial<LayoutBlock>
{
    return round && block.w > ROUND_MAX_COLUMNS ? { w: ROUND_MAX_COLUMNS } : {};
}

// A small picture of a style: the real face for drawn styles, a quick look-alike for flip and
// text (those run on Tick.js, too heavy for ten previews) and the progress bar.
function StylePreview({ style }: { style: ClockStyle })
{
    const time = dayjs().format("HH:mm");
    if (style === "flip")
    {
        return (
            <span className="style-preview-flip">
                {time.split("").map((character, characterIndex) =>
                    (character === ":" ? <i key={characterIndex} /> : <b key={characterIndex}>{character}</b>))}
            </span>
        );
    }
    if (style === "text")
    {
        return <span className="style-preview-text">{time}</span>;
    }
    if (style === "progress")
    {
        return (
            <span className="style-preview-bar">
                <i style={{ width: `${(dayjs().second() + 1) / 60 * 100}%` }} />
            </span>
        );
    }
    return <ClockFace style={style} format={isRound(style) ? "HH:mm:ss" : "HH:mm"} />;
}

// How the clock is drawn, as a grid of live previews.
export function ClockStylePicker({ block, onChange }: BlockSettingsProps)
{
    const text = useStrings().clockStyle;
    const background = useAtomValue(ATOMS.BOX_BACKGROUND);
    const current = block.clockStyle ?? "flip";

    return (
        <InspectorField label={text.label}>
            <div className="clock-style-picker" role="radiogroup" aria-label={text.label}>
                {CLOCK_STYLES.map((style) => (
                    <UnstyledButton
                        key={style}
                        className={style === current ? "clock-style selected" : "clock-style"}
                        role="radio"
                        aria-label={text.names[style]}
                        aria-checked={style === current}
                        onClick={() => onChange({ clockStyle: style, ...narrowed(block, isRound(style)) })}
                    >
                        <span className="clock-style-preview" style={{ background, fontSize: isRound(style) ? ROUND_PREVIEW_SIZE : DIGITS_PREVIEW_SIZE }}>
                            <StylePreview style={style} />
                        </span>
                        <span className="clock-style-name">{text.names[style]}</span>
                    </UnstyledButton>
                ))}
            </div>
            {current !== "flip" && current !== "text" && current !== "progress" && <p className="inspector-note">{text.secondsNote}</p>}
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
