import { LayoutGrid, type ClockLayout, type LayoutBlock, type CellRect } from "../../../layout/ClockLayout";

interface SizePresetsProps
{
    layout: ClockLayout;
    block: LayoutBlock;
    onPick: (rect: CellRect) => void;
}

const PRESETS: { w: number; h: number }[] = [
    { w: 1, h: 1 },
    { w: 2, h: 1 },
    { w: 3, h: 1 },
    { w: 2, h: 2 },
    { w: 3, h: 2 },
    { w: 4, h: 2 },
];

// Common block sizes. A size that needs more room moves the block left or up if that frees it;
// sizes that collide anyway are disabled.
export function SizePresets({ layout, block, onPick }: SizePresetsProps)
{
    const grid = new LayoutGrid(layout);
    const presets = PRESETS.filter((preset) => preset.w <= layout.columns && preset.h <= layout.rows);

    return (
        <div className="size-presets">
            {presets.map((preset) =>
            {
                const rect = {
                    x: Math.min(block.x, layout.columns - preset.w),
                    y: Math.min(block.y, layout.rows - preset.h),
                    w: preset.w,
                    h: preset.h,
                };
                const current = block.w === preset.w && block.h === preset.h;
                const fits = grid.fits(rect, block.id);
                return (
                    <button
                        key={`${preset.w}x${preset.h}`}
                        type="button"
                        className="size-preset"
                        aria-pressed={current}
                        disabled={!fits && !current}
                        onClick={() => onPick(rect)}
                    >
                        <span className="size-preset-icon" style={{ width: preset.w * 9, height: preset.h * 9 }} />
                        {preset.w}×{preset.h}
                    </button>
                );
            })}
        </div>
    );
}
