import type { CSSProperties } from "react";
import { DOT_GLYPHS, dotText } from "./DotGlyphs";

interface DotMatrixFaceProps
{
    text: string;
    member?: number;
}

const PITCH = 10;
const DOT_RADIUS = 3.6;
const HEIGHT = 7 * PITCH;
// Every how many dots one sparkles with the "sparkle" effect, and how many start times they spread over.
// The "few" variant keeps every third of them (a multiple of the spacing), "many" adds more.
const SPARKLE_SPACING = 11;
const FEW_SPARKLES_SPACING = 33;
const MANY_SPARKLES_SPACING = 5;
const SPARKLE_PHASES = 17;

// One column of dots: its left edge in columns and whether each of its seven dots is lit.
interface DotColumn
{
    column: number;
    lit: boolean[];
}

// Characters made of dots, like an LED matrix sign (DotGlyphs). Unlit dots stay faintly
// visible; characters without a glyph are a narrow gap. Dots are grouped by column, so the
// column-wise effects (faces.css) animate one group per column, not every dot.
export function DotMatrixFace({ text, member }: DotMatrixFaceProps)
{
    const columns: DotColumn[] = [];
    let column = 0;
    dotText(text).split("").forEach((character, characterIndex) =>
    {
        const rows = DOT_GLYPHS[character] ?? DOT_GLYPHS[" "];
        if (characterIndex > 0)
        {
            column++; // one empty column between characters
        }
        for (let bitIndex = 0; bitIndex < rows[0].length; bitIndex++)
        {
            columns.push({ column: column + bitIndex, lit: rows.map((row) => row[bitIndex] === "1") });
        }
        column += rows[0].length;
    });
    const width = column * PITCH;

    return (
        <svg className="clock-face face-dots" data-member={member} viewBox={`0 0 ${width} ${HEIGHT}`} style={{ width: `${width / HEIGHT}em`, "--columns": column } as CSSProperties}>
            {columns.map((dotColumn, columnIndex) => (
                <g key={columnIndex} style={{ "--column": dotColumn.column } as CSSProperties}>
                    {dotColumn.lit.map((lit, rowIndex) =>
                    {
                        // A few scattered dots, each with its own start, for the "sparkle" effect.
                        const dotIndex = columnIndex * dotColumn.lit.length + rowIndex;
                        let className = lit ? "face-lit" : "face-unlit";
                        if (dotIndex % SPARKLE_SPACING === 0)
                        {
                            className += " dot-sparkle";
                        }
                        if (dotIndex % FEW_SPARKLES_SPACING === 0)
                        {
                            className += " dot-sparkle-few";
                        }
                        if (dotIndex % MANY_SPARKLES_SPACING === 0)
                        {
                            className += " dot-sparkle-many";
                        }
                        const sparkles = className.includes("dot-sparkle");
                        const sparkleStyle = sparkles ? { "--phase": (dotIndex * 5) % SPARKLE_PHASES } as CSSProperties : undefined;
                        return (
                            <circle
                                key={rowIndex}
                                className={className}
                                style={sparkleStyle}
                                cx={dotColumn.column * PITCH + PITCH / 2}
                                cy={rowIndex * PITCH + PITCH / 2}
                                r={DOT_RADIUS}
                            />
                        );
                    })}
                </g>
            ))}
        </svg>
    );
}
