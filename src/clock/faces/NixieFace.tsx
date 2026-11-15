interface NixieFaceProps
{
    text: string;
    member?: number;
}

const TUBE_DIGITS = "1234567890".split("");

// Glowing digits in glass tubes. The unlit digits of each tube stay faintly visible behind.
export function NixieFace({ text, member }: NixieFaceProps)
{
    return (
        <span className="clock-face face-nixie" data-member={member}>
            {text.split("").map((character, characterIndex) =>
            {
                if (!/\d/.test(character))
                {
                    return <span key={characterIndex} className={character === ":" ? "nixie-dot" : "nixie-gap"} />;
                }
                return (
                    <span key={characterIndex} className="nixie-tube">
                        {TUBE_DIGITS.map((digit) => (
                            <span key={digit} className={digit === character ? "nixie-digit face-lit" : "nixie-digit"}>{digit}</span>
                        ))}
                    </span>
                );
            })}
        </span>
    );
}
