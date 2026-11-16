import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

// Per-viewer convenience, not a clock setting: kept out of the atoms (and tuxhub).
const STORAGE_KEY = "layoutInspectorWidth";
const MIN_WIDTH = 280;
// The canvas keeps priority: the inspector takes at most this share of the page and always
// leaves the canvas column this much room (the minimum width wins in a very small window).
const MAX_SHARE = 0.6;
const CANVAS_MIN_WIDTH = 420;
const KEY_STEP = 16;

function readStoredWidth(): number | null
{
    try
    {
        const stored = Number(localStorage.getItem(STORAGE_KEY));
        return stored > 0 ? stored : null;
    }
    catch
    {
        return null;
    }
}

function storeWidth(width: number | null)
{
    try
    {
        if (width === null)
        {
            localStorage.removeItem(STORAGE_KEY);
        }
        else
        {
            localStorage.setItem(STORAGE_KEY, String(Math.round(width)));
        }
    }
    catch
    {
        // Storage blocked: the width just lasts until the window closes.
    }
}

// Width of the layout editor's inspector: automatic (CSS clamp) until the divider is dragged,
// then the chosen width in pixels. Double-click on the divider goes back to automatic.
export function useInspectorWidth()
{
    const [width, setWidth] = useState<number | null>(readStoredWidth);
    const inspectorRef = useRef<HTMLElement>(null);

    function clamped(wanted: number): number
    {
        const pageWidth = inspectorRef.current?.parentElement?.clientWidth ?? window.innerWidth;
        const maxWidth = Math.min(pageWidth * MAX_SHARE, pageWidth - CANVAS_MIN_WIDTH);
        return Math.max(MIN_WIDTH, Math.min(wanted, maxWidth));
    }

    function apply(wanted: number)
    {
        const next = clamped(wanted);
        setWidth(next);
        storeWidth(next);
    }

    function onPointerDown(event: PointerEvent<HTMLDivElement>)
    {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: PointerEvent<HTMLDivElement>)
    {
        const page = inspectorRef.current?.parentElement;
        if (!page || !event.currentTarget.hasPointerCapture(event.pointerId))
        {
            return;
        }
        apply(page.getBoundingClientRect().right - event.clientX);
    }

    function onKeyDown(event: KeyboardEvent<HTMLDivElement>)
    {
        const current = inspectorRef.current?.offsetWidth ?? MIN_WIDTH;
        if (event.key === "ArrowLeft")
        {
            event.preventDefault();
            apply(current + KEY_STEP);
        }
        else if (event.key === "ArrowRight")
        {
            event.preventDefault();
            apply(current - KEY_STEP);
        }
    }

    function reset()
    {
        setWidth(null);
        storeWidth(null);
    }

    // The stored width still bows to the page: a smaller window shrinks it again.
    const style = width === null ? undefined : { width: `clamp(${MIN_WIDTH}px, ${width}px, min(${MAX_SHARE * 100}%, 100% - ${CANVAS_MIN_WIDTH}px))` };
    const dividerProps = { onPointerDown, onPointerMove, onKeyDown, onDoubleClick: reset };
    return { inspectorRef, style, dividerProps };
}
