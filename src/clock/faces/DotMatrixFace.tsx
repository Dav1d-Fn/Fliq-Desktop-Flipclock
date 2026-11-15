interface DotMatrixFaceProps
{
    text: string;
    member?: number;
}

// 5 × 7 dot font, one string of 0/1 per row.
const DOT_FONT: Record<string, string[]> = {
    0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
    3: ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
    4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
    7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
    ":": ["0", "0", "1", "0", "1", "0", "0"],
    " ": ["0", "0", "0", "0", "0", "0", "0"],
};

const PITCH = 10;
const DOT_RADIUS = 3.6;
const HEIGHT = 7 * PITCH;

// Digits made of dots, like an LED matrix sign. Unlit dots stay faintly visible.
export function DotMatrixFace({ text, member }: DotMatrixFaceProps)
{
    const dots: { x: number; y: number; lit: boolean }[] = [];
    let column = 0;
    text.split("").forEach((character, characterIndex) =>
    {
        const rows = DOT_FONT[character] ?? DOT_FONT[" "];
        if (characterIndex > 0)
        {
            column++; // one empty column between characters
        }
        rows.forEach((row, rowIndex) =>
        {
            row.split("").forEach((bit, bitIndex) =>
            {
                dots.push({ x: (column + bitIndex) * PITCH + PITCH / 2, y: rowIndex * PITCH + PITCH / 2, lit: bit === "1" });
            });
        });
        column += rows[0].length;
    });
    const width = column * PITCH;

    return (
        <svg className="clock-face face-dots" data-member={member} viewBox={`0 0 ${width} ${HEIGHT}`} style={{ width: `${width / HEIGHT}em` }}>
            {dots.map((dot, dotIndex) => (
                <circle key={dotIndex} className={dot.lit ? "face-lit" : "face-unlit"} cx={dot.x} cy={dot.y} r={DOT_RADIUS} />
            ))}
        </svg>
    );
}
