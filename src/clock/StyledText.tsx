import { CSSProperties, ReactNode } from "react";
import type { FlipUnit, IconStyle, TextStyle } from "../layout/ClockLayout";
import { splitIcons, withFlatIcons } from "../weather/FlatWeatherIcons";
import { ClockTemplate } from "./ClockTemplate";
import { DotMatrixFace } from "./faces/DotMatrixFace";
import { NixieFace } from "./faces/NixieFace";
import { SegmentFace } from "./faces/SegmentFace";
import "./faces/faces.css";

interface StyledTextProps
{
    text: string;
    style: TextStyle;
    flipUnit?: FlipUnit;
    iconStyle: IconStyle;
    member?: number;
    className?: string;
    css?: CSSProperties;
}

// Letters and digits get a card; spaces, commas and other signs sit between the cards.
const CARD_CHARACTER = /[\p{L}\p{N}]/u;
const SEPARATOR = /^[\s,]+$/u;

const RUN_STYLE: CSSProperties = { display: "inline-flex", alignItems: "center", whiteSpace: "pre" };

// One flip card at rest, built like Tick.js builds it (so flip.min.css and flipclockstyles.css
// draw it the same), only without the animation: text that is not time changes rarely.
function FlipCard({ text, unit }: { text: string; unit: FlipUnit })
{
    return (
        <span className="tick-flip" data-unit={unit}>
            <span className="tick-flip-spacer">{text}</span>
            <span className="tick-flip-shadow tick-flip-shadow-top tick-flip-front" />
            <span className="tick-flip-shadow tick-flip-shadow-bottom tick-flip-back" />
            <span className="tick-flip-card-shadow" />
            <span className="tick-flip-card">
                <span className="tick-flip-panel-front tick-flip-front tick-flip-panel">
                    <span className="tick-flip-panel-front-text"><span className="tick-flip-panel-text-wrapper">{text}</span></span>
                    <span className="tick-flip-panel-front-shadow" />
                </span>
                <span className="tick-flip-panel-back tick-flip-back tick-flip-panel">
                    <span className="tick-flip-panel-back-text"><span className="tick-flip-panel-text-wrapper">{text}</span></span>
                    <span className="tick-flip-panel-back-highlight" />
                    <span className="tick-flip-panel-back-shadow" />
                </span>
            </span>
        </span>
    );
}

function flipCards(text: string, unit: FlipUnit): ReactNode[]
{
    return ClockTemplate.slots(text, unit).map((slot, slotIndex) =>
    {
        const card = unit === "word" ? !SEPARATOR.test(slot) : CARD_CHARACTER.test(slot);
        return card
            ? <FlipCard key={slotIndex} text={slot} unit={unit} />
            : <span key={slotIndex} className="tick-text-inline">{slot}</span>;
    });
}

function styledPart(text: string, style: TextStyle, flipUnit: FlipUnit): ReactNode
{
    switch (style)
    {
        case "flip":
            return flipCards(text, flipUnit);
        case "segment":
            return <SegmentFace text={text} />;
        case "dots":
            return <DotMatrixFace text={text} />;
        case "nixie":
            return <NixieFace text={text} />;
        case "text":
            return text;
    }
}

// Text that is not time (text, weather, calendar) in a block's text style. Weather and calendar
// emoji stay icons beside it, colored or flat, never drawn in the style.
export function StyledText({ text, style, flipUnit = "character", iconStyle, member, className = "normal-text-settings", css }: StyledTextProps)
{
    const parts = splitIcons(text).map(({ part, icon }, partIndex) =>
    {
        if (icon)
        {
            return <span key={partIndex} className="normal-text-settings">{iconStyle === "flat" ? withFlatIcons(part) : part}</span>;
        }
        // Drawn styles: the spaces around an icon stay text, so they keep their width.
        const trimmed = part.trim();
        if (style !== "text" && style !== "flip" && trimmed !== part)
        {
            const before = part.slice(0, part.indexOf(trimmed));
            const after = part.slice(before.length + trimmed.length);
            return (
                <span key={partIndex} style={RUN_STYLE}>
                    {before}
                    {trimmed !== "" && styledPart(trimmed, style, flipUnit)}
                    {after}
                </span>
            );
        }
        return <span key={partIndex} style={RUN_STYLE}>{styledPart(part, style, flipUnit)}</span>;
    });
    return (
        <span className={`${className} styled-text styled-${style}`} data-member={member} style={{ ...RUN_STYLE, ...css }}>
            {parts}
        </span>
    );
}
