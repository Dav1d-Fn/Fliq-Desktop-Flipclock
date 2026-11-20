import type { CSSProperties } from "react";
import { IconMinus, IconPlus } from "@tabler/icons-react";

interface GridStepperProps
{
    // Read out for the group, e.g. "Columns".
    label: string;
    addLabel: string;
    removeLabel: string;
    value: number;
    canRemove: boolean;
    canAdd: boolean;
    // Rows stand at the clock's right edge (+ above −), columns above it (− left of +).
    vertical: boolean;
    style: CSSProperties;
    onChange: (value: number) => void;
}

// A small −/count/+ pill at the edge of the canvas clock that adds or removes a column or row.
export function GridStepper({ label, addLabel, removeLabel, value, canRemove, canAdd, vertical, style, onChange }: GridStepperProps)
{
    const remove = (
        <button type="button" className="grid-stepper-button" aria-label={removeLabel} title={removeLabel} disabled={!canRemove} onClick={() => onChange(value - 1)}>
            <IconMinus size={14} stroke={2.2} />
        </button>
    );
    const add = (
        <button type="button" className="grid-stepper-button" aria-label={addLabel} title={addLabel} disabled={!canAdd} onClick={() => onChange(value + 1)}>
            <IconPlus size={14} stroke={2.2} />
        </button>
    );
    return (
        <div role="group" aria-label={label} title={label} className={`grid-stepper${vertical ? " vertical" : ""}`} style={style}>
            {vertical ? add : remove}
            <span className="grid-stepper-value" aria-live="polite">{value}</span>
            {vertical ? remove : add}
        </div>
    );
}
