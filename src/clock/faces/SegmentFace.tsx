interface SegmentFaceProps
{
    text: string;
    // Colons dimmed this second.
    blinkOff: boolean;
    member?: number;
}

// Lit segments a-g per digit (a top, then clockwise, g the middle bar).
const LIT_SEGMENTS = ["abcdef", "bc", "abged", "abgcd", "fgbc", "afgcd", "afgedc", "abc", "abcdefg", "abcdfg"];

function horizontal(left: number, right: number, y: number): string
{
    return `${left},${y} ${left + 5},${y - 5} ${right - 5},${y - 5} ${right},${y} ${right - 5},${y + 5} ${left + 5},${y + 5}`;
}

function vertical(x: number, top: number, bottom: number): string
{
    return `${x},${top} ${x + 5},${top + 5} ${x + 5},${bottom - 5} ${x},${bottom} ${x - 5},${bottom - 5} ${x - 5},${top + 5}`;
}

// Segment outlines in a 60 × 100 digit cell.
const SEGMENT_SHAPES: Record<string, string> = {
    a: horizontal(9, 51, 6),
    b: vertical(54, 9, 47),
    c: vertical(54, 53, 91),
    d: horizontal(9, 51, 94),
    e: vertical(6, 53, 91),
    f: vertical(6, 9, 47),
    g: horizontal(9, 51, 50),
};

const DIGIT_WIDTH = 72;
const NARROW_WIDTH = 26;
const HEIGHT = 100;

// Seven-segment digits like an alarm clock display. Unlit segments stay faintly visible.
export function SegmentFace({ text, blinkOff, member }: SegmentFaceProps)
{
    let x = 0;
    const parts = text.split("").map((character, characterIndex) =>
    {
        const left = x;
        if (/\d/.test(character))
        {
            x += DIGIT_WIDTH;
            const lit = LIT_SEGMENTS[Number(character)];
            return (
                <g key={characterIndex} transform={`translate(${left + 8} 0) skewX(-6)`}>
                    {Object.entries(SEGMENT_SHAPES).map(([name, points]) => (
                        <polygon key={name} className={lit.includes(name) ? "face-lit" : "face-unlit"} points={points} />
                    ))}
                </g>
            );
        }
        x += NARROW_WIDTH;
        if (character !== ":")
        {
            return null;
        }
        const className = blinkOff ? "face-unlit" : "face-lit";
        return (
            <g key={characterIndex} className={className}>
                <circle cx={left + NARROW_WIDTH / 2} cy={32} r={5.5} />
                <circle cx={left + NARROW_WIDTH / 2 - 4} cy={70} r={5.5} />
            </g>
        );
    });

    return (
        <svg className="clock-face face-segment" data-member={member} viewBox={`0 0 ${x} ${HEIGHT}`} style={{ width: `${x / HEIGHT}em` }}>
            {parts}
        </svg>
    );
}
