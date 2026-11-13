import { ActionIcon } from "@mantine/core";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { BLOCK_DEFINITIONS } from "../../../blocks/BlockRegistry";
import { GRID_LIMITS, type BlockKind, type ClockLayout } from "../../../layout/ClockLayout";
import { BLOCK_EDITORS } from "./BlockEditors";

interface AddBlockBarProps
{
    layout: ClockLayout;
    onAdd: (kind: BlockKind) => void;
    onResizeGrid: (columns: number, rows: number) => void;
}

interface StepperProps
{
    label: string;
    value: number;
    canRemove: boolean;
    canAdd: boolean;
    onChange: (value: number) => void;
}

function Stepper({ label, value, canRemove, canAdd, onChange }: StepperProps)
{
    return (
        <div className="grid-stepper">
            {label}
            <ActionIcon variant="default" size={30} aria-label={`Remove ${label.toLowerCase().replace(/s$/, "")}`} disabled={!canRemove} onClick={() => onChange(value - 1)}>
                <IconMinus size={15} />
            </ActionIcon>
            <span className="grid-stepper-value">{value}</span>
            <ActionIcon variant="default" size={30} aria-label={`Add ${label.toLowerCase().replace(/s$/, "")}`} disabled={!canAdd} onClick={() => onChange(value + 1)}>
                <IconPlus size={15} />
            </ActionIcon>
        </div>
    );
}

// Below the canvas: grid size steppers and one tile per block kind.
export function AddBlockBar({ layout, onAdd, onResizeGrid }: AddBlockBarProps)
{
    return (
        <>
            <div className="add-bar-head">
                <div className="add-bar-title">Add a block</div>
                <div className="grid-steppers">
                    <Stepper
                        label="Columns"
                        value={layout.columns}
                        canRemove={layout.columns > GRID_LIMITS.minColumns}
                        canAdd={layout.columns < GRID_LIMITS.maxColumns}
                        onChange={(columns) => onResizeGrid(columns, layout.rows)}
                    />
                    <Stepper
                        label="Rows"
                        value={layout.rows}
                        canRemove={layout.rows > GRID_LIMITS.minRows}
                        canAdd={layout.rows < GRID_LIMITS.maxRows}
                        onChange={(rows) => onResizeGrid(layout.columns, rows)}
                    />
                </div>
            </div>
            <div className="block-tiles">
                {BLOCK_DEFINITIONS.map((definition) =>
                {
                    const Icon = BLOCK_EDITORS[definition.kind].icon;
                    return (
                        <button key={definition.kind} type="button" className="block-tile" onClick={() => onAdd(definition.kind)}>
                            <Icon size={24} stroke={1.8} color="var(--fliq-accent)" />
                            {definition.name}
                        </button>
                    );
                })}
            </div>
        </>
    );
}
