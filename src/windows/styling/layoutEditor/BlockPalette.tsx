import type { PointerEvent } from "react";
import { BLOCK_DEFINITIONS } from "../../../blocks/BlockRegistry";
import type { BlockKind } from "../../../layout/ClockLayout";
import { named, useStrings } from "../../../i18n/useStrings";
import { BLOCK_EDITORS } from "./BlockEditors";

interface BlockPaletteProps
{
    // A click (or Enter/Space) adds the kind on the next free spot.
    onAdd: (kind: BlockKind) => void;
    // A press that may become a drag onto the canvas. The button captures the pointer, so the
    // canvas follows it through the button's move and release.
    onPress: (kind: BlockKind, event: PointerEvent<HTMLButtonElement>) => void;
    onMove: (event: PointerEvent<HTMLButtonElement>) => void;
    onRelease: () => void;
}

// Above the canvas, top left: one compact button per block kind.
export function BlockPalette({ onAdd, onPress, onMove, onRelease }: BlockPaletteProps)
{
    const strings = useStrings();
    return (
        <div className="block-palette" role="toolbar" aria-label={strings.addBar.title}>
            {BLOCK_DEFINITIONS.map((definition) =>
            {
                const Icon = BLOCK_EDITORS[definition.kind].icon;
                const name = named(strings, definition.name);
                const hint = strings.addBar.addKind(name);
                return (
                    <button
                        key={definition.kind}
                        type="button"
                        className="block-tile"
                        aria-label={hint}
                        title={hint}
                        onPointerDown={(event) => onPress(definition.kind, event)}
                        onPointerMove={onMove}
                        onPointerUp={onRelease}
                        onPointerCancel={onRelease}
                        onClick={() => onAdd(definition.kind)}
                    >
                        <Icon size={18} stroke={1.8} color="var(--fliq-accent)" />
                        <span>{name}</span>
                    </button>
                );
            })}
        </div>
    );
}
