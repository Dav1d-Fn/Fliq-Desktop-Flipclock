import { useEffect, useRef, useState } from "react";
import { useAtom } from "jotai";
import type { ClockLayout } from "../../../layout/ClockLayout";
import { ATOMS } from "../../../settings/atoms";

// Everything the layout editor changes: the layout and the whole-clock settings.
interface EditorSnapshot
{
    layout: ClockLayout;
    scale: number;
    background: string;
    cornerRadius: number;
    padding: number;
    font: string;
    textColor: string;
}

export interface EditorHistory
{
    canUndo: boolean;
    canRedo: boolean;
    undo: () => void;
    redo: () => void;
}

// Changes closer together than this, or while a pointer is held (a slider pulled), form one step.
const QUIET_TIME = 400;

function isTextField(target: EventTarget | null): boolean
{
    const element = target as HTMLElement | null;
    return Boolean(element?.isContentEditable || element?.closest("input, textarea, select"));
}

// Undo and redo for the layout editor: Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y (text fields keep their
// own undo). It watches the settings instead of wrapping every setter, so whatever writes them
// (canvas, inspector, steppers) is covered. Recording starts with the first click or key press,
// so loading the stored values is never a step.
export function useEditorHistory(): EditorHistory
{
    const [layout, setLayout] = useAtom(ATOMS.CLOCK_LAYOUT);
    const [scale, setScale] = useAtom(ATOMS.CLOCK_SCALE);
    const [background, setBackground] = useAtom(ATOMS.BOX_BACKGROUND);
    const [cornerRadius, setCornerRadius] = useAtom(ATOMS.CLOCK_CORNER_RADIUS);
    const [padding, setPadding] = useAtom(ATOMS.CLOCK_PADDING);
    const [font, setFont] = useAtom(ATOMS.TEXT_FONT);
    const [textColor, setTextColor] = useAtom(ATOMS.TEXT_COLOR);
    const snapshot: EditorSnapshot = { layout, scale, background, cornerRadius, padding, font, textColor };
    const serialized = JSON.stringify(snapshot);

    const past = useRef<EditorSnapshot[]>([]);
    const future = useRef<EditorSnapshot[]>([]);
    // The state before the step in progress (or the current state between steps).
    const base = useRef(snapshot);
    const latest = useRef(snapshot);
    latest.current = snapshot;
    const stepOpen = useRef(false);
    const armed = useRef(false);
    const pointerDown = useRef(false);
    const quietTimer = useRef<number | undefined>(undefined);
    // Re-renders the undo/redo buttons when only the stacks changed.
    const [, setRevision] = useState(0);

    function closeStep()
    {
        window.clearTimeout(quietTimer.current);
        if (!stepOpen.current)
        {
            return;
        }
        stepOpen.current = false;
        // A slider pulled away and back again changed nothing.
        if (JSON.stringify(latest.current) === JSON.stringify(base.current))
        {
            past.current.pop();
        }
        base.current = latest.current;
        setRevision((revision) => revision + 1);
    }

    function waitForQuiet()
    {
        window.clearTimeout(quietTimer.current);
        quietTimer.current = window.setTimeout(() =>
        {
            // Still held: pointerup waits again.
            if (!pointerDown.current)
            {
                closeStep();
            }
        }, QUIET_TIME);
    }

    useEffect(() =>
    {
        if (stepOpen.current)
        {
            waitForQuiet();
            return;
        }
        if (!armed.current)
        {
            base.current = latest.current;
            return;
        }
        if (serialized === JSON.stringify(base.current))
        {
            return;
        }
        past.current.push(base.current);
        future.current = [];
        stepOpen.current = true;
        setRevision((revision) => revision + 1);
        waitForQuiet();
    }, [serialized]);

    function apply(target: EditorSnapshot)
    {
        base.current = target;
        setLayout(target.layout);
        setScale(target.scale);
        setBackground(target.background);
        setCornerRadius(target.cornerRadius);
        setPadding(target.padding);
        setFont(target.font);
        setTextColor(target.textColor);
        setRevision((revision) => revision + 1);
    }

    function undo()
    {
        closeStep();
        const target = past.current.pop();
        if (target)
        {
            future.current.push(latest.current);
            apply(target);
        }
    }

    function redo()
    {
        closeStep();
        const target = future.current.pop();
        if (target)
        {
            past.current.push(latest.current);
            apply(target);
        }
    }

    // Latest undo/redo for the listeners below, which are added once.
    const actions = useRef({ undo, redo });
    actions.current = { undo, redo };

    useEffect(() =>
    {
        const onPointerDown = () =>
        {
            armed.current = true;
            pointerDown.current = true;
        };
        const onPointerUp = () =>
        {
            pointerDown.current = false;
            if (stepOpen.current)
            {
                waitForQuiet();
            }
        };
        const onKeyDown = (event: KeyboardEvent) =>
        {
            armed.current = true;
            const key = event.key.toLowerCase();
            if (!(event.ctrlKey || event.metaKey) || (key !== "z" && key !== "y") || isTextField(event.target))
            {
                return;
            }
            event.preventDefault();
            if (key === "y" || event.shiftKey)
            {
                actions.current.redo();
            }
            else
            {
                actions.current.undo();
            }
        };
        window.addEventListener("pointerdown", onPointerDown, true);
        window.addEventListener("pointerup", onPointerUp, true);
        window.addEventListener("pointercancel", onPointerUp, true);
        window.addEventListener("keydown", onKeyDown);
        return () =>
        {
            window.removeEventListener("pointerdown", onPointerDown, true);
            window.removeEventListener("pointerup", onPointerUp, true);
            window.removeEventListener("pointercancel", onPointerUp, true);
            window.removeEventListener("keydown", onKeyDown);
            window.clearTimeout(quietTimer.current);
        };
    }, []);

    return {
        canUndo: past.current.length > 0,
        canRedo: future.current.length > 0,
        undo,
        redo,
    };
}
