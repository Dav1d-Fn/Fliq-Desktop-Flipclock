import type { CSSProperties, ReactNode } from "react";
import { UnstyledButton } from "@mantine/core";
import { useAtomValue } from "jotai";
import { BLOCK_DEFAULTS, type LayoutBlock } from "../../../../layout/ClockLayout";
import { ATOMS } from "../../../../settings/atoms";

export interface StyleTile
{
    id: string;
    name: string;
    preview: ReactNode;
    // As high as wide (analog, rings): the preview fills the tile's height.
    round?: boolean;
    // Characters in the preview: long text gets a smaller font, so it still fits.
    previewLength?: number;
}

interface StyleTilesProps
{
    label: string;
    tiles: StyleTile[];
    current: string;
    // For the flip cards' colors and rounding in the previews.
    block: LayoutBlock;
    onPick: (id: string) => void;
}

// Characters that fit a tile at the normal preview size.
const FITTING_LENGTH = 5;

// Width of a Tick.js flip card in em, see ClockBlock.
const FLIP_CARD_WIDTH_EM = 1.125;

// Styles as a grid of small live previews (clock and text style pickers). The tiles stand in
// about two rows; a narrow inspector wraps them into more (layoutEditor.css).
export function StyleTiles({ label, tiles, current, block, onPick }: StyleTilesProps)
{
    const background = useAtomValue(ATOMS.BOX_BACKGROUND);
    const pickerStyle = {
        "--style-columns": Math.ceil(tiles.length / 2),
        "--flipcard-bg-color": block.cardColor ?? BLOCK_DEFAULTS.cardColor,
        "--flipcard-rounded": `${(block.cardRadius ?? BLOCK_DEFAULTS.cardRadius) / 100 * FLIP_CARD_WIDTH_EM}em`,
        "--text-color": "#fafafa",
    } as CSSProperties;

    return (
        <div className="clock-style-picker" role="radiogroup" aria-label={label} style={pickerStyle}>
            {tiles.map((tile) =>
            {
                const length = tile.previewLength ?? FITTING_LENGTH;
                const scaleStyle = length > FITTING_LENGTH ? { fontSize: `min(${85 / length}cqw, 34cqh)` } : undefined;
                return (
                    <UnstyledButton
                        key={tile.id}
                        className={tile.id === current ? "clock-style selected" : "clock-style"}
                        role="radio"
                        aria-label={tile.name}
                        aria-checked={tile.id === current}
                        onClick={() => onPick(tile.id)}
                    >
                        <span className={tile.round ? "clock-style-preview round" : "clock-style-preview"} style={{ background }}>
                            <span className="clock-style-preview-scale" style={scaleStyle}>{tile.preview}</span>
                        </span>
                        <span className="clock-style-name">{tile.name}</span>
                    </UnstyledButton>
                );
            })}
        </div>
    );
}
