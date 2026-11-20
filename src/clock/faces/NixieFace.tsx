import type { CSSProperties } from "react";

interface NixieFaceProps
{
    text: string;
    member?: number;
}

const TUBE_DIGITS = "1234567890".split("");

// Glowing digits in glass tubes. The unlit digits of each tube stay faintly visible behind.
// Nixie tubes only had digits: letters and signs glow in the same color without a tube.
export function NixieFace({ text, member }: NixieFaceProps)
{
    return (
        <span className="clock-face face-nixie" data-member={member}>
            {text.split("").map((character, characterIndex) =>
            {
                if (character === ":")
                {
                    return <span key={characterIndex} className="nixie-dot" />;
                }
                if (character.trim() === "")
                {
                    return <span key={characterIndex} className="nixie-gap" />;
                }
                if (!/\d/.test(character))
                {
                    return <span key={characterIndex} className="nixie-glyph face-lit">{character}</span>;
                }
                // Position for the effects in faces.css: each tube pulses and flickers on its own.
                const effectStyle = { "--column": characterIndex } as CSSProperties;
                return (
                    <span key={characterIndex} className="nixie-tube" style={effectStyle}>
                        {TUBE_DIGITS.map((digit) => (
                            <span key={digit} className={digit === character ? "nixie-digit face-lit" : "nixie-digit"}>{digit}</span>
                        ))}
                    </span>
                );
            })}
        </span>
    );
}
