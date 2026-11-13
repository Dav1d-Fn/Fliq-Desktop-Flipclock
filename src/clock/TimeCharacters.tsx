import { memo } from "react";
import dayjs from "dayjs";

interface TimeCharactersProps
{
    format: string;
    keyPrefix: string;
    flip: boolean;
    // Group member index, written as data-member (see Segment.member).
    member?: number;
}

// Letters and digits flip; everything else (":", ".", spaces) sits between the cards.
const FLIPPING_CHARACTER = /[\p{L}\p{N}]/u;

// The spans of one TIME/FLIPTIME segment, one per character.
//
// Tick.js takes these spans over after the first render and changes their content itself. React
// must never touch them again, or it would fight Tick.js over the same nodes. Hence the memo that
// always reports "unchanged": a different format remounts the whole block (see ClockBlock)
// instead of re-rendering this.
function TimeCharactersComponent({ format, keyPrefix, flip, member }: TimeCharactersProps)
{
    const characters = dayjs().format(format).split("");

    return (
        <>
            {characters.map((character, characterIndex) =>
            {
                const dataKey = `${keyPrefix}${characterIndex}`;

                if (!flip)
                {
                    return (
                        <span key={characterIndex} data-key={dataKey} data-member={member} className="normal-text-settings" data-view="text">
                            {character}
                        </span>
                    );
                }
                if (!FLIPPING_CHARACTER.test(character))
                {
                    return (
                        <span key={characterIndex} data-key={dataKey} data-member={member} className="tick-text-inline" data-view="text">
                            {character}
                        </span>
                    );
                }
                return (
                    <span key={characterIndex} data-key={dataKey} data-member={member} data-transform="pad(0)" data-view="flip">
                        {character}
                    </span>
                );
            })}
        </>
    );
}

export const TimeCharacters = memo(TimeCharactersComponent, () => true);
