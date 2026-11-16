import { SEGMENT_DOTS, segmentGlyphs, segmentText, SEVEN_SEGMENT_GLYPHS } from "./SegmentGlyphs";

interface SegmentFaceProps
{
    text: string;
    // Colons dimmed this second (the clock's blinking colon).
    blinkOff?: boolean;
    member?: number;
}

// Thickness of the bars, as half widths: seven segments are bolder, fourteen leave room for the
// diagonals and the middle bars.
const SEVEN_HALF_WIDTH = 5;
const FOURTEEN_HALF_WIDTH = 4;

function horizontal(left: number, right: number, y: number, half: number): string
{
    return `${left},${y} ${left + half},${y - half} ${right - half},${y - half} ${right},${y} ${right - half},${y + half} ${left + half},${y + half}`;
}

function vertical(x: number, top: number, bottom: number, half: number): string
{
    return `${x},${top} ${x + half},${top + half} ${x + half},${bottom - half} ${x},${bottom} ${x - half},${bottom - half} ${x - half},${top + half}`;
}

// A bar from (x1, y1) to (x2, y2), `half` wide to each side.
function diagonal(x1: number, y1: number, x2: number, y2: number, half: number): string
{
    const length = Math.hypot(x2 - x1, y2 - y1);
    const offsetX = (y2 - y1) / length * half;
    const offsetY = (x1 - x2) / length * half;
    return `${x1 + offsetX},${y1 + offsetY} ${x2 + offsetX},${y2 + offsetY} ${x2 - offsetX},${y2 - offsetY} ${x1 - offsetX},${y1 - offsetY}`;
}

// Segment outlines in a 60 × 100 cell.
const SEVEN_SEGMENT_SHAPES: Record<string, string> = {
    a: horizontal(9, 51, 6, SEVEN_HALF_WIDTH),
    b: vertical(54, 9, 47, SEVEN_HALF_WIDTH),
    c: vertical(54, 53, 91, SEVEN_HALF_WIDTH),
    d: horizontal(9, 51, 94, SEVEN_HALF_WIDTH),
    e: vertical(6, 53, 91, SEVEN_HALF_WIDTH),
    f: vertical(6, 9, 47, SEVEN_HALF_WIDTH),
    g: horizontal(9, 51, 50, SEVEN_HALF_WIDTH),
};

const FOURTEEN_SEGMENT_SHAPES: Record<string, string> = {
    a: horizontal(8, 52, 5, FOURTEEN_HALF_WIDTH),
    b: vertical(55, 8, 48, FOURTEEN_HALF_WIDTH),
    c: vertical(55, 52, 92, FOURTEEN_HALF_WIDTH),
    d: horizontal(8, 52, 95, FOURTEEN_HALF_WIDTH),
    e: vertical(5, 52, 92, FOURTEEN_HALF_WIDTH),
    f: vertical(5, 8, 48, FOURTEEN_HALF_WIDTH),
    g1: horizontal(8, 29, 50, FOURTEEN_HALF_WIDTH),
    g2: horizontal(31, 52, 50, FOURTEEN_HALF_WIDTH),
    h: diagonal(12, 12, 25, 44, 3),
    i: vertical(30, 10, 46, 3.5),
    j: diagonal(48, 12, 35, 44, 3),
    k: diagonal(25, 56, 12, 88, 3),
    l: vertical(30, 54, 90, 3.5),
    m: diagonal(35, 56, 48, 88, 3),
};

const DIGIT_WIDTH = 72;
const NARROW_WIDTH = 26;
const HEIGHT = 100;

// Characters like an alarm clock display: seven segments for digits, fourteen as soon as the
// text has letters (SegmentGlyphs). Unlit segments stay faintly visible; characters without a
// glyph stay dark cells.
export function SegmentFace({ text, blinkOff = false, member }: SegmentFaceProps)
{
    const shown = segmentText(text);
    const glyphs = segmentGlyphs(shown);
    const shapes = glyphs === SEVEN_SEGMENT_GLYPHS ? SEVEN_SEGMENT_SHAPES : FOURTEEN_SEGMENT_SHAPES;

    let x = 0;
    const parts = shown.split("").map((character, characterIndex) =>
    {
        const left = x;
        if (SEGMENT_DOTS.includes(character))
        {
            x += NARROW_WIDTH;
            const middle = left + NARROW_WIDTH / 2;
            if (character === ":")
            {
                return (
                    <g key={characterIndex} className={blinkOff ? "face-unlit" : "face-lit"}>
                        <circle cx={middle} cy={32} r={5.5} />
                        <circle cx={middle - 4} cy={70} r={5.5} />
                    </g>
                );
            }
            return (
                <g key={characterIndex} className="face-lit">
                    <circle cx={middle - 6} cy={91} r={5.5} />
                    {character === "," && <polygon points={diagonal(middle - 4, 94, middle - 10, 106, 2.5)} />}
                </g>
            );
        }
        if (character === " ")
        {
            x += NARROW_WIDTH;
            return null;
        }
        x += DIGIT_WIDTH;
        const lit = glyphs[character] ?? [];
        return (
            <g key={characterIndex} transform={`translate(${left + 8} 0) skewX(-6)`}>
                {Object.entries(shapes).map(([name, points]) => (
                    <polygon key={name} className={lit.includes(name) ? "face-lit" : "face-unlit"} points={points} />
                ))}
            </g>
        );
    });

    return (
        <svg className="clock-face face-segment" data-member={member} viewBox={`0 0 ${x} ${HEIGHT}`} style={{ width: `${x / HEIGHT}em` }}>
            {parts}
        </svg>
    );
}
