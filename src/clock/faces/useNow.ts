import { useEffect, useState } from "react";

// A little past the full second, so the timer never lands just before it.
const SECOND_MARGIN_MS = 10;

// The current time, updated once a second on the full second. Each clock face has its own,
// so only that face re-renders (Tick.js styles have their own timer in BlockContent).
export function useNow(): Date
{
    const [now, setNow] = useState(() => new Date());

    useEffect(() =>
    {
        let timer = 0;
        const delay = () => 1000 - (Date.now() % 1000) + SECOND_MARGIN_MS;
        const update = () =>
        {
            timer = window.setTimeout(update, delay());
            setNow(new Date());
        };
        timer = window.setTimeout(update, delay());
        return () => window.clearTimeout(timer);
    }, []);

    return now;
}
