import { CSSProperties, MouseEvent, PointerEvent, useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { IconX } from "@tabler/icons-react";
import { blockDefinition } from "../../../blocks/BlockRegistry";
import GridClock from "../../../clock/GridClock";
import { BLOCK_HEIGHTS, useLayoutGrid } from "../../../clock/useLayoutGrid";
import { GRID_LIMITS, LayoutGrid, type BlockKind, type CellRect, type ClockLayout, type DropZone, type LayoutBlock, type PixelRect } from "../../../layout/ClockLayout";
import { useStrings } from "../../../i18n/useStrings";
import { ATOMS } from "../../../settings/atoms";
import { BlockPalette } from "./BlockPalette";
import { BLOCK_EDITORS } from "./BlockEditors";
import { GridStepper } from "./GridStepper";
import { MemberMenu } from "./MemberMenu";
import { SLIDER_CONFIGS } from "../../../settings/options";

type DragMode = "move" | "right" | "bottom" | "corner";

interface Drag
{
    blockId: number;
    mode: DragMode;
    startX: number;
    startY: number;
    // Pointer travel in px at scale 1.
    deltaX: number;
    deltaY: number;
    // Past the few px that still count as a click.
    moved: boolean;
    // Where the pointer grabbed the block, in px at scale 1 from its top left corner.
    grabX: number;
    grabY: number;
    // A moved block whose pointer left the clock: no target on the grid, the remove target
    // shows (and the pointer is over it).
    outside: boolean;
    overTrash: boolean;
}

// A block kind pressed in the palette: a drag onto the clock once the pointer travelled.
interface PaletteDrag
{
    kind: BlockKind;
    startX: number;
    startY: number;
    clientX: number;
    clientY: number;
    moved: boolean;
    // Pointer on the grid in px at scale 1; null outside the clock.
    point: { x: number; y: number } | null;
}

// Where a move, resize or new block lands: its cells, and the layout dropping there gives (null
// while the cells are taken). `makesRoom`: blocks in the way shrink for it.
interface Landing
{
    rect: CellRect;
    layout: ClockLayout | null;
    makesRoom: boolean;
}

// The group member a right-click opened the menu for; x/y in px inside the canvas.
interface MemberTarget
{
    groupId: number;
    index: number;
    x: number;
    y: number;
}

// A block the dragged one was dropped onto: join it (on which side of its members), or slide
// in beside it or into a new row above or below it, with the layout that gives (`inserted`).
interface DropTarget
{
    block: LayoutBlock;
    zone: DropZone;
    before: boolean;
    inserted: ClockLayout | null;
}

interface LayoutCanvasProps
{
    layout: ClockLayout;
    editing: boolean;
    // Several with shift/ctrl-click, to group them.
    selectedIds: number[];
    poppingId: number | null;
    removingIds: number[];
    shaking: boolean;
    toast: string | null;
    // `additive`: shift/ctrl-click, adds the block to the selection or takes it out.
    onSelect: (blockId: number | null, additive?: boolean) => void;
    // A palette button clicked: the kind goes on the next free spot.
    onAddKind: (kind: BlockKind) => void;
    // A palette kind dropped onto the clock: the layout with it (`blockId`) in place.
    onAddBlock: (layout: ClockLayout, blockId: number) => void;
    // A block dropped onto the remove target below the clock.
    onRemove: (blockId: number) => void;
    onResizeGrid: (columns: number, rows: number) => void;
    // A block dropped onto another: they become a group, or it joins the target group.
    onMerge: (targetId: number, droppedId: number, before: boolean) => void;
    // A block dropped near another's edge (it slides in there, the line makes room) or on free
    // cells, or moved or resized where neighbours shrink for it.
    onInsert: (layout: ClockLayout) => void;
    // A column's width dragged on its edge, or reset with a double-click.
    onChange: (update: (current: ClockLayout) => ClockLayout) => void;
    // Group member menu (right-click on a member).
    onMoveMember: (groupId: number, index: number, step: number) => void;
    onDetachMember: (groupId: number, index: number) => void;
    onOpenMember: (groupId: number, index: number) => void;
}

const SPRING = "cubic-bezier(.34,1.45,.64,1)";
const CLICK_TOLERANCE = 4;
// Room kept free around the clock inside the canvas, in px: the row stepper on the right and
// the column stepper above need it, the other sides mirror them so the clock stays centered.
const CANVAS_MARGIN = 120;
// Space between the clock's edge (above: the column grips) and its row and column steppers, in px.
const STEPPER_GAP = 12;
// The round remove target at the bottom of the canvas: its size and distance to the bottom, and
// how far around it a drop still counts, in px.
const TRASH_SIZE = 56;
const TRASH_BOTTOM = 18;
const TRASH_REACH = 14;
// Sizes a new block from the palette tries on the cells it is dropped on, after its own.
const SMALLER_SIZES = [{ w: 2, h: 1 }, { w: 1, h: 1 }];
// Smallest size a block shrinks to while its edge is pulled, in px at scale 1.
const MIN_LIVE_WIDTH = 40;
const MIN_LIVE_HEIGHT = 36;
// Column edges: grips in a strip above the grid (in the clock padding), this far outside it and
// this high, in screen px.
const COLUMN_EDGE_OUTSIDE = 16;
const COLUMN_EDGE_HEIGHT = 14;

// A column edge being dragged: the column, its width when grabbed (px at scale 1), the pointer
// x then (screen px) and the canvas scale then, so a canvas that rescales does not move the
// pointer's meaning mid-drag.
interface ColumnDrag
{
    column: number;
    startWidth: number;
    startX: number;
    scale: number;
}

// The editor canvas: the real clock, scaled to fit, with the editing layer on top (cells, the
// snap ghost, one hit box per block with its resize handles).
export function LayoutCanvas(props: LayoutCanvasProps)
{
    const { layout, editing, selectedIds, poppingId, removingIds, shaking, toast, onSelect, onAddKind, onAddBlock, onRemove, onResizeGrid, onMerge, onInsert, onChange, onMoveMember, onDetachMember, onOpenMember } = props;
    const padding = useAtomValue(ATOMS.CLOCK_PADDING);
    const strings = useStrings();
    const stageRef = useRef<HTMLDivElement>(null);
    const layerRef = useRef<HTMLDivElement>(null);
    const [paletteDrag, setPaletteDrag] = useState<PaletteDrag | null>(null);
    // Set when a palette press turned into a drag, so the click that may follow adds nothing.
    const paletteDragged = useRef(false);
    const [scale, setScale] = useState(1);
    const [drag, setDrag] = useState<Drag | null>(null);
    const [columnDrag, setColumnDrag] = useState<ColumnDrag | null>(null);
    const [memberTarget, setMemberTarget] = useState<MemberTarget | null>(null);
    const [memberHighlight, setMemberHighlight] = useState<PixelRect | null>(null);
    const grid = useLayoutGrid(layout);
    const blockHeights = useAtomValue(BLOCK_HEIGHTS);
    const gridSize = grid.size(1);

    // Largest scale up to 1 at which the whole clock fits the canvas.
    useEffect(() =>
    {
        const stage = stageRef.current;
        if (!stage)
        {
            return;
        }
        const fit = () =>
        {
            const width = gridSize.width + 2 * padding;
            const height = gridSize.height + 2 * padding;
            setScale(Math.min(1, (stage.clientWidth - CANVAS_MARGIN) / width, (stage.clientHeight - CANVAS_MARGIN) / height));
        };
        fit();
        const observer = new ResizeObserver(fit);
        observer.observe(stage);
        return () => observer.disconnect();
    }, [gridSize.width, gridSize.height, padding]);

    // The menu's group and member, while both still exist (the layout may change under it).
    const menuGroup = memberTarget && layout.blocks.find((block) => block.id === memberTarget.groupId && block.kind === "group");
    const menuCount = menuGroup?.items?.length ?? 0;
    const menuOpen = memberTarget !== null && memberTarget.index < menuCount && editing;

    // Frame around the member's characters, measured from the DOM after the clock rendered.
    useEffect(() =>
    {
        if (!menuOpen || !memberTarget)
        {
            setMemberHighlight(null);
            return;
        }
        const measure = () =>
        {
            const stage = stageRef.current?.getBoundingClientRect();
            const parts = [...document.querySelectorAll(`.clock-block[data-block-id="${memberTarget.groupId}"] [data-member="${memberTarget.index}"]`)]
                .map((element) => element.getBoundingClientRect())
                .filter((rect) => rect.width > 0);
            if (!stage || parts.length === 0)
            {
                setMemberHighlight(null);
                return;
            }
            const left = Math.min(...parts.map((rect) => rect.left));
            const top = Math.min(...parts.map((rect) => rect.top));
            const right = Math.max(...parts.map((rect) => rect.right));
            const bottom = Math.max(...parts.map((rect) => rect.bottom));
            setMemberHighlight({ left: left - stage.left, top: top - stage.top, width: right - left, height: bottom - top });
        };
        // Right away, and once more after the block fitted its font size to new content.
        measure();
        const frame = requestAnimationFrame(measure);
        return () => cancelAnimationFrame(frame);
    }, [menuOpen, memberTarget, layout, scale]);

    // Right-click on a group: the member under the pointer, or the nearest one beside it.
    function openMemberMenu(event: MouseEvent<HTMLElement>, block: LayoutBlock)
    {
        const stage = stageRef.current?.getBoundingClientRect();
        if (!editing || block.kind !== "group" || !stage)
        {
            return;
        }
        event.preventDefault();
        const members = [...document.querySelectorAll<HTMLElement>(`.clock-block[data-block-id="${block.id}"] [data-member]`)];
        const hit = document.elementsFromPoint(event.clientX, event.clientY).find((element) => members.includes(element as HTMLElement)) as HTMLElement | undefined;
        const distance = (element: HTMLElement) =>
        {
            const rect = element.getBoundingClientRect();
            return Math.max(rect.left - event.clientX, event.clientX - rect.right, 0);
        };
        const nearest = hit ?? [...members].sort((a, b) => distance(a) - distance(b))[0];
        if (!nearest)
        {
            return;
        }
        onSelect(block.id);
        setMemberTarget({ groupId: block.id, index: Number(nearest.dataset.member), x: event.clientX - stage.left, y: event.clientY - stage.top });
    }

    const draggedBlock = drag ? layout.blocks.find((block) => block.id === drag.blockId) : undefined;

    // The pointer on the grid in px at scale 1, or null while it is outside the clock box.
    function gridPoint(clientX: number, clientY: number): { x: number; y: number } | null
    {
        const layer = layerRef.current?.getBoundingClientRect();
        if (!layer)
        {
            return null;
        }
        const edge = padding * scale;
        const inside = clientX >= layer.left - edge && clientX <= layer.right + edge && clientY >= layer.top - edge && clientY <= layer.bottom + edge;
        return inside ? { x: (clientX - layer.left) / scale, y: (clientY - layer.top) / scale } : null;
    }

    // True when the pointer is on the remove target (or close to it).
    function overTrash(clientX: number, clientY: number): boolean
    {
        const stage = stageRef.current?.getBoundingClientRect();
        if (!stage)
        {
            return false;
        }
        const centerX = stage.left + stage.width / 2;
        const centerY = stage.bottom - TRASH_BOTTOM - TRASH_SIZE / 2;
        return Math.hypot(clientX - centerX, clientY - centerY) <= TRASH_SIZE / 2 + TRASH_REACH;
    }

    // Cells for `rect`, with the blocks in the way shrunk when they can give way.
    function landingAt(rect: CellRect, ignoredId: number | null): Landing
    {
        const room = grid.withRoomFor(rect, ignoredId);
        return { rect, layout: room, makesRoom: room !== null && !grid.fits(rect, ignoredId) };
    }

    // A moved block on free cells (or where neighbours shrink), or a resized one. None while a
    // moved block hovers another (`dropTarget` decides then) or is outside the clock.
    function blockLanding(current: Drag | null, dragged: LayoutBlock | undefined): Landing | null
    {
        if (!current || !dragged || !current.moved || current.outside)
        {
            return null;
        }
        const landing = landingAt(target(dragged, current), dragged.id);
        const placed = landing.layout && {
            ...landing.layout,
            blocks: landing.layout.blocks.map((block) => (block.id === dragged.id ? { ...block, ...landing.rect } : block)),
        };
        return { ...landing, layout: placed };
    }

    // A palette kind over the clock, centered on the pointer: the first of its own size, 2 x 1
    // and 1 x 1 that finds free cells there; failing that, the first its neighbours can shrink for.
    function paletteLanding(current: PaletteDrag | null): Landing | null
    {
        if (!current?.moved || !current.point)
        {
            return null;
        }
        const point = current.point;
        const definition = blockDefinition(current.kind);
        const sizes = [definition.defaultSize, ...SMALLER_SIZES].filter((size) => size.w <= layout.columns && size.h <= layout.rows);
        const candidates = sizes.map((size) =>
        {
            const block: LayoutBlock = { id: grid.nextBlockId(), kind: current.kind, ...definition.defaults, x: 0, y: 0, ...size };
            const extent = grid.pixelRect(block, 1);
            const rect = grid.moveTarget(block, point.x - extent.width / 2, point.y - extent.height / 2);
            return { block: { ...block, ...rect }, landing: landingAt(rect, null) };
        });
        const chosen = candidates.find((candidate) => candidate.landing.layout && !candidate.landing.makesRoom)
            ?? candidates.find((candidate) => candidate.landing.layout)
            ?? candidates[0];
        if (!chosen)
        {
            return null;
        }
        const { block, landing } = chosen;
        return { ...landing, layout: landing.layout && { ...landing.layout, blocks: [...landing.layout.blocks, block] } };
    }

    // The block under the pointer while one is moved, if any, and what dropping there does.
    function dropTarget(current: Drag | null): DropTarget | null
    {
        const dragged = current && layout.blocks.find((block) => block.id === current.blockId);
        if (!current || !dragged || !current.moved || current.mode !== "move")
        {
            return null;
        }
        const start = grid.pixelRect(dragged, 1);
        const pointerX = start.left + current.grabX + current.deltaX;
        const pointerY = start.top + current.grabY + current.deltaY;
        for (const block of layout.blocks)
        {
            const rect = grid.pixelRect(block, 1);
            if (block.id !== dragged.id && pointerX >= rect.left && pointerX < rect.left + rect.width && pointerY >= rect.top && pointerY < rect.top + rect.height)
            {
                const shareX = (pointerX - rect.left) / rect.width;
                const shareY = (pointerY - rect.top) / rect.height;
                let zone = LayoutGrid.dropZone(block, dragged, shareX, shareY, true);
                let inserted = zone === "above" || zone === "below" ? grid.withBlockInNewRow(block.id, dragged.id, zone === "below") : null;
                if ((zone === "above" || zone === "below") && !inserted)
                {
                    // No new row possible here: the other zones take its place.
                    zone = LayoutGrid.dropZone(block, dragged, shareX, shareY, false);
                }
                if (zone === "group")
                {
                    return { block, zone, before: shareX < 0.5, inserted: null };
                }
                if (zone === "before" || zone === "after")
                {
                    inserted = grid.withBlockInserted(block.id, dragged.id, zone === "before");
                }
                return zone && inserted ? { block, zone, before: zone === "before", inserted } : null;
            }
        }
        return null;
    }

    const drop = dropTarget(drag);
    const merge = drop?.zone === "group" ? drop : null;
    const landing = drop ? null : blockLanding(drag, draggedBlock) ?? paletteLanding(paletteDrag);
    // While a block hovers near another's edge, or neighbours shrink to make room, the others
    // already stand where they would go (and as wide), drawn on the grid of that layout.
    const previewLayout = drop?.inserted ?? (landing?.makesRoom ? landing.layout : null);
    const preview = previewLayout ? new Map(previewLayout.blocks.map((block) => [block.id, block])) : null;
    const previewGrid = previewLayout ? new LayoutGrid(previewLayout, LayoutGrid.autoRowHeights(previewLayout, blockHeights)) : grid;

    function target(block: LayoutBlock, current: Drag): CellRect
    {
        return current.mode === "move"
            ? grid.moveTarget(block, current.deltaX, current.deltaY)
            : grid.resizeTarget(block, current.mode, current.deltaX, current.deltaY);
    }

    // Where a block is drawn: under the pointer while dragged, on its cells otherwise.
    function blockRect(block: LayoutBlock): PixelRect
    {
        const rect = grid.pixelRect(block, scale);
        if (!drag || !drag.moved || drag.blockId !== block.id)
        {
            return preview ? previewGrid.pixelRect(preview.get(block.id) ?? block, scale) : rect;
        }
        if (drag.mode === "move")
        {
            return { ...rect, left: rect.left + drag.deltaX * scale, top: rect.top + drag.deltaY * scale };
        }
        return {
            ...rect,
            width: drag.mode === "bottom" ? rect.width : Math.max(MIN_LIVE_WIDTH * scale, rect.width + drag.deltaX * scale),
            height: drag.mode === "right" ? rect.height : Math.max(MIN_LIVE_HEIGHT * scale, rect.height + drag.deltaY * scale),
        };
    }

    function isLive(block: LayoutBlock): boolean
    {
        return drag !== null && drag.moved && drag.blockId === block.id;
    }

    function isLifted(block: LayoutBlock): boolean
    {
        return isLive(block) && drag?.mode === "move";
    }

    // Lift, spring transitions and add/remove animations; the same on block and hit box.
    function motionStyle(block: LayoutBlock): CSSProperties
    {
        let animation = "none";
        if (block.id === poppingId)
        {
            animation = "fliq-pop .45s cubic-bezier(.34,1.56,.64,1)";
        }
        else if (removingIds.includes(block.id))
        {
            animation = "fliq-out .2s ease-in forwards";
        }
        return {
            translate: `${(block.offsetX ?? 0) * scale}px ${(block.offsetY ?? 0) * scale}px`,
            transform: isLifted(block) ? "scale(1.04)" : "scale(1)",
            transition: isLive(block)
                ? "transform .15s, box-shadow .15s"
                : `left .36s ${SPRING}, top .36s ${SPRING}, width .36s ${SPRING}, height .36s ${SPRING}, transform .22s, box-shadow .22s, background .25s`,
            animation,
            // Over a merge target the dragged block goes below the editor layer (z-index 5),
            // so the "Drop to group" hint shows on top.
            zIndex: isLive(block) ? (merge ? 4 : 10) : selectedIds.includes(block.id) ? 3 : 2,
            opacity: isLive(block) && (merge || drag?.overTrash) ? 0.6 : 1,
        };
    }

    // No editing tint: the canvas looks like the real clock, selection shows on the hit box.
    function blockStyle(block: LayoutBlock): CSSProperties
    {
        return {
            ...motionStyle(block),
            boxShadow: isLifted(block) ? "0 16px 32px rgba(0,0,0,0.55)" : "none",
        };
    }

    function startDrag(event: PointerEvent<HTMLElement>, block: LayoutBlock, mode: DragMode)
    {
        if (!editing || event.button !== 0)
        {
            return;
        }
        event.stopPropagation();
        event.preventDefault();
        if (mode === "move" && (event.shiftKey || event.ctrlKey || event.metaKey))
        {
            onSelect(block.id, true);
            return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        onSelect(block.id);
        const grabbed = event.currentTarget.getBoundingClientRect();
        setDrag({
            blockId: block.id,
            mode,
            startX: event.clientX,
            startY: event.clientY,
            deltaX: 0,
            deltaY: 0,
            moved: false,
            grabX: (event.clientX - grabbed.left) / scale,
            grabY: (event.clientY - grabbed.top) / scale,
            outside: false,
            overTrash: false,
        });
    }

    function moveDrag(event: PointerEvent<HTMLElement>)
    {
        if (!drag)
        {
            return;
        }
        const deltaX = (event.clientX - drag.startX) / scale;
        const deltaY = (event.clientY - drag.startY) / scale;
        const moved = drag.moved || Math.abs(deltaX) + Math.abs(deltaY) > CLICK_TOLERANCE;
        const outside = moved && drag.mode === "move" && gridPoint(event.clientX, event.clientY) === null;
        setDrag({ ...drag, deltaX, deltaY, moved, outside, overTrash: outside && overTrash(event.clientX, event.clientY) });
    }

    // Dropped outside the clock: removed on the remove target, back to its cells anywhere else.
    function endDrag()
    {
        if (drag?.overTrash && draggedBlock)
        {
            onRemove(draggedBlock.id);
        }
        else if (merge && draggedBlock)
        {
            onMerge(merge.block.id, draggedBlock.id, merge.before);
        }
        else if (drop?.inserted)
        {
            onInsert(drop.inserted);
        }
        else if (landing?.layout)
        {
            onInsert(landing.layout);
        }
        setDrag(null);
    }

    function pressPalette(kind: BlockKind, event: PointerEvent<HTMLButtonElement>)
    {
        paletteDragged.current = false;
        if (event.button !== 0)
        {
            return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        setPaletteDrag({ kind, startX: event.clientX, startY: event.clientY, clientX: event.clientX, clientY: event.clientY, moved: false, point: null });
    }

    function movePalette(event: PointerEvent<HTMLButtonElement>)
    {
        if (!paletteDrag)
        {
            return;
        }
        const travel = Math.abs(event.clientX - paletteDrag.startX) + Math.abs(event.clientY - paletteDrag.startY);
        const moved = paletteDrag.moved || travel > CLICK_TOLERANCE;
        paletteDragged.current = moved;
        setPaletteDrag({ ...paletteDrag, clientX: event.clientX, clientY: event.clientY, moved, point: gridPoint(event.clientX, event.clientY) });
    }

    function endPalette()
    {
        if (landing?.layout && paletteDrag)
        {
            onAddBlock(landing.layout, grid.nextBlockId());
        }
        setPaletteDrag(null);
    }

    function clickPalette(kind: BlockKind)
    {
        if (!paletteDragged.current)
        {
            onAddKind(kind);
        }
        paletteDragged.current = false;
    }

    function renderGhost()
    {
        if (merge && draggedBlock)
        {
            return (
                <div className="snap-ghost merge" style={{ ...grid.pixelRect(merge.block, scale), borderRadius: 10 * scale }}>
                    <span>{merge.block.kind === "group" ? strings.canvas.dropToAddToGroup : strings.canvas.dropToGroup}</span>
                </div>
            );
        }
        if (drop?.inserted && draggedBlock)
        {
            return (
                <div className="snap-ghost" style={{ ...previewGrid.pixelRect(preview?.get(draggedBlock.id) ?? draggedBlock, scale), borderRadius: 10 * scale }}>
                    <span>{drop.zone === "above" || drop.zone === "below" ? strings.canvas.dropToNewRow : strings.canvas.dropToSlideIn}</span>
                </div>
            );
        }
        if (!landing)
        {
            return null;
        }
        let label = strings.canvas.occupied;
        if (landing.makesRoom)
        {
            label = strings.canvas.dropToMakeRoom;
        }
        else if (landing.layout)
        {
            label = drag?.mode === "move" || paletteDrag ? strings.canvas.dropHere : `${landing.rect.w} × ${landing.rect.h}`;
        }
        return (
            <div className={landing.layout ? "snap-ghost" : "snap-ghost occupied"} style={{ ...previewGrid.pixelRect(landing.rect, scale), borderRadius: 10 * scale }}>
                <span>{label}</span>
            </div>
        );
    }

    // Only free cells: the blocks are see-through, and lines through the clock would be noise.
    function renderCells()
    {
        const cells = [];
        for (let y = 0; y < layout.rows; y++)
        {
            for (let x = 0; x < layout.columns; x++)
            {
                if (!grid.fits({ x, y, w: 1, h: 1 }))
                {
                    continue;
                }
                cells.push(
                    <span
                        key={`${x}-${y}`}
                        className="grid-cell"
                        style={{ ...grid.pixelRect({ x, y, w: 1, h: 1 }, scale), borderRadius: 10 * scale, opacity: editing ? 1 : 0 }}
                    />,
                );
            }
        }
        return cells;
    }

    function setColumnWidth(column: number, width: number | null)
    {
        onChange((current) => new LayoutGrid(current).withColumnWidth(column, width));
    }

    function startColumnDrag(event: PointerEvent<HTMLElement>, column: number)
    {
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        setColumnDrag({ column, startWidth: grid.trackSize({ axis: "column", index: column }), startX: event.clientX, scale });
    }

    function moveColumnEdge(event: PointerEvent<HTMLElement>)
    {
        if (!columnDrag)
        {
            return;
        }
        const { min, max } = SLIDER_CONFIGS.COLUMN_WIDTH;
        const width = columnDrag.startWidth + (event.clientX - columnDrag.startX) / columnDrag.scale;
        setColumnWidth(columnDrag.column, Math.round(Math.min(max, Math.max(min, width))));
    }

    // One grip per column at its right edge (in the gap after it), above the grid: drag to set
    // its width, double-click to let it follow the default width again.
    function renderColumnEdges()
    {
        const edges = [];
        for (let column = 0; column < layout.columns; column++)
        {
            const edge = (grid.columnEnd(column) + grid.gap("column") / 2) * scale;
            const name = strings.grid.columnEdge(column + 1);
            const dragging = columnDrag?.column === column;
            const own = grid.columnWidthOverride(column) !== null;
            edges.push(
                <button
                    key={column}
                    type="button"
                    aria-label={name}
                    title={name}
                    className={`column-edge${dragging ? " dragging" : ""}${own ? " own" : ""}`}
                    style={{ left: edge, top: -COLUMN_EDGE_OUTSIDE, height: COLUMN_EDGE_HEIGHT }}
                    onPointerDown={(event) => startColumnDrag(event, column)}
                    onPointerMove={moveColumnEdge}
                    onPointerUp={() => setColumnDrag(null)}
                    onPointerCancel={() => setColumnDrag(null)}
                    onDoubleClick={() => setColumnWidth(column, null)}
                />,
            );
        }
        return edges;
    }

    const overlay = (
        <div
            ref={layerRef}
            className="editor-layer"
            style={{ pointerEvents: editing ? "auto" : "none" }}
            onPointerDown={() => editing && onSelect(null)}
        >
            {renderGhost()}
            {editing && renderColumnEdges()}
            {editing && layout.blocks.map((block) =>
            {
                const selected = selectedIds.includes(block.id);
                const merging = merge?.block.id === block.id;
                const handles = selected && selectedIds.length === 1 && !isLifted(block);
                return (
                    <div
                        key={block.id}
                        className={`block-hitbox${selected ? " selected" : ""}${merging ? " merge-target" : ""}`}
                        style={{ ...blockRect(block), ...motionStyle(block), borderRadius: 10 * scale, cursor: isLifted(block) ? "grabbing" : "grab" }}
                        onPointerDown={(event) => startDrag(event, block, "move")}
                        onPointerMove={moveDrag}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                        onContextMenu={(event) => openMemberMenu(event, block)}
                    >
                        {handles && (
                            <>
                                <button type="button" aria-label={strings.canvas.resizeWidth} className="resize-handle right" onPointerDown={(event) => startDrag(event, block, "right")} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} />
                                <button type="button" aria-label={strings.canvas.resizeHeight} className="resize-handle bottom" onPointerDown={(event) => startDrag(event, block, "bottom")} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} />
                                <button type="button" aria-label={strings.canvas.resizeBoth} className="resize-handle corner" onPointerDown={(event) => startDrag(event, block, "corner")} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} />
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );

    // The clock box on the canvas, for the steppers at its edges.
    const clockWidth = (gridSize.width + 2 * padding) * scale;
    const clockHeight = (gridSize.height + 2 * padding) * scale;
    const dragging = drag?.moved || paletteDrag?.moved;
    const PaletteIcon = paletteDrag?.moved ? BLOCK_EDITORS[paletteDrag.kind].icon : null;

    return (
        <>
            <BlockPalette onAdd={clickPalette} onPress={pressPalette} onMove={movePalette} onRelease={endPalette} />
            <div className="layout-canvas" ref={stageRef}>
                <GridClock
                    layout={layout}
                    scale={scale}
                    blockRect={blockRect}
                    blockStyle={blockStyle}
                    underlay={renderCells()}
                    overlay={overlay}
                    style={{
                        boxShadow: "0 18px 40px rgba(16,24,40,0.18)",
                        animation: shaking ? "fliq-shake .42s ease-in-out" : "none",
                        transition: "background .3s, border-radius .25s, padding .3s",
                    }}
                />
                {memberHighlight && <div className="member-highlight" style={memberHighlight} />}
                {menuOpen && memberTarget && (
                    <MemberMenu
                        x={memberTarget.x}
                        y={memberTarget.y}
                        index={memberTarget.index}
                        count={menuCount}
                        onMove={(step) =>
                        {
                            onMoveMember(memberTarget.groupId, memberTarget.index, step);
                            setMemberTarget({ ...memberTarget, index: memberTarget.index + step });
                        }}
                        onDetach={() => onDetachMember(memberTarget.groupId, memberTarget.index)}
                        onSettings={() => onOpenMember(memberTarget.groupId, memberTarget.index)}
                        onClose={() => setMemberTarget(null)}
                    />
                )}
                {toast && <div className="canvas-toast" role="status">{toast}</div>}
                {editing && !dragging && (
                    <>
                        <GridStepper
                            vertical
                            label={strings.addBar.rows}
                            addLabel={strings.addBar.addRow}
                            removeLabel={strings.addBar.removeRow}
                            value={layout.rows}
                            canRemove={layout.rows > GRID_LIMITS.minRows}
                            canAdd={layout.rows < GRID_LIMITS.maxRows}
                            style={{ left: `calc(50% + ${clockWidth / 2 + STEPPER_GAP}px)`, top: "50%", transform: "translateY(-50%)" }}
                            onChange={(rows) => onResizeGrid(layout.columns, rows)}
                        />
                        {/* Above the column edge grips, which stick out of the clock's top. */}
                        <GridStepper
                            vertical={false}
                            label={strings.addBar.columns}
                            addLabel={strings.addBar.addColumn}
                            removeLabel={strings.addBar.removeColumn}
                            value={layout.columns}
                            canRemove={layout.columns > GRID_LIMITS.minColumns}
                            canAdd={layout.columns < GRID_LIMITS.maxColumns}
                            style={{ left: "50%", top: `calc(50% - ${clockHeight / 2 + COLUMN_EDGE_OUTSIDE + STEPPER_GAP}px)`, transform: "translate(-50%, -100%)" }}
                            onChange={(columns) => onResizeGrid(columns, layout.rows)}
                        />
                    </>
                )}
                {drag?.outside && (
                    <div
                        className={`trash-target${drag.overTrash ? " active" : ""}`}
                        style={{ width: TRASH_SIZE, height: TRASH_SIZE, bottom: TRASH_BOTTOM }}
                        role="status"
                        aria-label={strings.canvas.dropToRemove}
                        title={strings.canvas.dropToRemove}
                    >
                        <IconX size={26} stroke={2.6} />
                    </div>
                )}
            </div>
            {PaletteIcon && paletteDrag && (
                <div className="palette-drag-chip" style={{ left: paletteDrag.clientX, top: paletteDrag.clientY }}>
                    <PaletteIcon size={18} stroke={1.8} color="var(--fliq-accent)" />
                </div>
            )}
        </>
    );
}
