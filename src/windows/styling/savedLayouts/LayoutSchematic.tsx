import { useAtomValue } from "jotai";
import type { ClockLayout } from "../../../layout/ClockLayout";
import { ATOMS } from "../../../settings/atoms";
import { BLOCK_EDITORS } from "../layoutEditor/BlockEditors";

interface LayoutSchematicProps
{
    layout: ClockLayout;
    // Longest side in px; the other follows the grid's columns and rows.
    size: number;
}

// What LayoutThumbnail shows when the clock itself cannot be drawn: the grid in the clock's background color, each block a tile
// with its kind's icon. Cells are drawn square, which is close enough for telling layouts apart.
export function LayoutSchematic({ layout, size }: LayoutSchematicProps)
{
    const background = useAtomValue(ATOMS.BOX_BACKGROUND);
    const longest = Math.max(layout.columns, layout.rows);
    const cell = size / longest;
    const iconSize = Math.max(8, Math.min(18, cell * 0.5));

    return (
        <span
            className="layout-schematic"
            aria-hidden="true"
            style={{
                width: cell * layout.columns,
                height: cell * layout.rows,
                background,
                gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
                padding: Math.max(2, cell * 0.08),
                gap: Math.max(1, cell * 0.08),
            }}
        >
            {layout.blocks.map((block) =>
            {
                const Icon = BLOCK_EDITORS[block.kind].icon;
                return (
                    <span
                        key={block.id}
                        className="layout-schematic-block"
                        style={{ gridColumn: `${block.x + 1} / span ${block.w}`, gridRow: `${block.y + 1} / span ${block.h}` }}
                    >
                        <Icon size={iconSize} />
                    </span>
                );
            })}
        </span>
    );
}
