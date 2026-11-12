import { memo } from "react";
import dayjs from "dayjs";

interface TimeCharactersProps
{
    format: string;
    keyPrefix: string;
    flip: boolean;
    separatorString: string;
}

// The spans of one TIME/FLIPTIME segment, one per character.
//
// Tick.js takes these spans over after the first render and changes their content itself. React
// must never touch them again, or it would fight Tick.js over the same nodes. Hence the memo that
// always reports "unchanged": a different format or separator set remounts the whole clock
// (see useClockLayoutKey) instead of re-rendering this.
function TimeCharactersComponent({ format, keyPrefix, flip, separatorString }: TimeCharactersProps)
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
                        <span key={characterIndex} data-key={dataKey} className="normal-text-settings" data-view="text">
                            {character}
                        </span>
                    );
                }
                if (separatorString.includes(character))
                {
                    return (
                        <span key={characterIndex} data-key={dataKey} className="tick-text-inline" data-view="text">
                            {character}
                        </span>
                    );
                }
                return (
                    <span key={characterIndex} data-key={dataKey} data-transform="pad(0)" data-view="flip">
                        {character}
                    </span>
                );
            })}
        </>
    );
}

export const TimeCharacters = memo(TimeCharactersComponent, () => true);
