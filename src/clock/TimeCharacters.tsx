import { memo } from "react";
import dayjs from "dayjs";
import type { FlipUnit } from "../layout/ClockLayout";
import { ClockTemplate } from "./ClockTemplate";

interface TimeCharactersProps
{
    format: string;
    keyPrefix: string;
    flip: boolean;
    // Flip only: one card per character or per word.
    flipUnit?: FlipUnit;
    // Group member index, written as data-member (see Segment.member).
    member?: number;
}

// Letters and digits flip; everything else (":", ".", spaces) sits between the cards. Per word,
// everything but spaces and commas flips.
const FLIPPING_CHARACTER = /[\p{L}\p{N}]/u;
const WORD_SEPARATOR = /^[\s,]+$/u;

// The spans of one TIME/FLIPTIME segment, one per character (or word, see ClockTemplate.slots).
//
// Tick.js takes these spans over after the first render and changes their content itself. React
// must never touch them again, or it would fight Tick.js over the same nodes. Hence the memo that
// always reports "unchanged": a different format remounts the whole block (see ClockBlock)
// instead of re-rendering this.
function TimeCharactersComponent({ format, keyPrefix, flip, flipUnit = "character", member }: TimeCharactersProps)
{
    const characters = ClockTemplate.slots(dayjs().format(format), flip ? flipUnit : "character");
    const flips = (slot: string) => (flipUnit === "word" ? !WORD_SEPARATOR.test(slot) : FLIPPING_CHARACTER.test(slot));

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
                if (!flips(character))
                {
                    return (
                        <span key={characterIndex} data-key={dataKey} data-member={member} className="tick-text-inline" data-view="text">
                            {character}
                        </span>
                    );
                }
                return (
                    <span key={characterIndex} data-key={dataKey} data-member={member} data-transform="pad(0)" data-view="flip" data-unit={flipUnit}>
                        {character}
                    </span>
                );
            })}
        </>
    );
}

export const TimeCharacters = memo(TimeCharactersComponent, () => true);
