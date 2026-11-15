import dayjs from "dayjs";
import { UnstyledButton } from "@mantine/core";
import { useAtomValue } from "jotai";
import { ClockFace } from "../../../../clock/faces/ClockFace";
import type { ClockStyle } from "../../../../layout/ClockLayout";
import { useStrings } from "../../../../i18n/useStrings";
import { ATOMS } from "../../../../settings/atoms";
import type { BlockSettingsProps } from "../BlockEditors";
import { InspectorField } from "../InspectorField";

// Picker order.
const CLOCK_STYLES: ClockStyle[] = ["flip", "text", "segment", "dots", "nixie", "analogMinimal", "analogClassic", "analogFine", "rings"];

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

// A small picture of a style: the real face for drawn styles, a quick look-alike for flip and
// text (those run on Tick.js, too heavy for nine previews).
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
                        onClick={() => onChange({ clockStyle: style, ...(isRound(style) && block.w > ROUND_MAX_COLUMNS && { w: ROUND_MAX_COLUMNS }) })}
                    >
                        <span className="clock-style-preview" style={{ background, fontSize: isRound(style) ? ROUND_PREVIEW_SIZE : DIGITS_PREVIEW_SIZE }}>
                            <StylePreview style={style} />
                        </span>
                        <span className="clock-style-name">{text.names[style]}</span>
                    </UnstyledButton>
                ))}
            </div>
            {current !== "flip" && current !== "text" && <p className="inspector-note">{text.secondsNote}</p>}
        </InspectorField>
    );
}
