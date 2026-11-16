import { DOT_GLYPHS, dotText } from "./DotGlyphs";

interface DotMatrixFaceProps
{
    text: string;
    member?: number;
}

const PITCH = 10;
const DOT_RADIUS = 3.6;
const HEIGHT = 7 * PITCH;

// Characters made of dots, like an LED matrix sign (DotGlyphs). Unlit dots stay faintly
// visible; characters without a glyph are a narrow gap.
export function DotMatrixFace({ text, member }: DotMatrixFaceProps)
{
    const dots: { x: number; y: number; lit: boolean }[] = [];
    let column = 0;
    dotText(text).split("").forEach((character, characterIndex) =>
    {
        const rows = DOT_GLYPHS[character] ?? DOT_GLYPHS[" "];
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
