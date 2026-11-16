import { CSSProperties, MouseEvent, PointerEvent, useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import GridClock from "../../../clock/GridClock";
import { BLOCK_HEIGHTS, useLayoutGrid } from "../../../clock/useLayoutGrid";
import { LayoutGrid, type CellRect, type ClockLayout, type DropZone, type LayoutBlock, type PixelRect } from "../../../layout/ClockLayout";
import { useStrings } from "../../../i18n/useStrings";
import { ATOMS } from "../../../settings/atoms";
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
    onPlace: (blockId: number, rect: CellRect) => void;
    // A block dropped onto another: they become a group, or it joins the target group.
    onMerge: (targetId: number, droppedId: number, before: boolean) => void;
    // A block dropped near another's edge: it slides in there, the line makes room.
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
// Room kept free around the clock inside the canvas, in px.
const CANVAS_MARGIN = 48;
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
    const { layout, editing, selectedIds, poppingId, removingIds, shaking, toast, onSelect, onPlace, onMerge, onInsert, onChange, onMoveMember, onDetachMember, onOpenMember } = props;
    const padding = useAtomValue(ATOMS.CLOCK_PADDING);
    const strings = useStrings();
    const stageRef = useRef<HTMLDivElement>(null);
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
    // While a block hovers near another's edge, the others already stand where they would go
    // (and as wide, when the line had to shrink), drawn on the grid of that layout.
    const preview = drop?.inserted ? new Map(drop.inserted.blocks.map((block) => [block.id, block])) : null;
    const previewGrid = drop?.inserted ? new LayoutGrid(drop.inserted, LayoutGrid.autoRowHeights(drop.inserted, blockHeights)) : grid;

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
            opacity: isLive(block) && merge ? 0.6 : 1,
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
        setDrag({ ...drag, deltaX, deltaY, moved });
    }

    function endDrag()
    {
        if (merge && draggedBlock)
        {
            onMerge(merge.block.id, draggedBlock.id, merge.before);
        }
        else if (drop?.inserted)
        {
            onInsert(drop.inserted);
        }
        else if (drag?.moved && draggedBlock)
        {
            const rect = target(draggedBlock, drag);
            if (grid.fits(rect, draggedBlock.id))
            {
                onPlace(draggedBlock.id, rect);
            }
        }
        setDrag(null);
    }

    function renderGhost()
    {
        if (!drag?.moved || !draggedBlock)
        {
            return null;
        }
        if (merge)
        {
            return (
                <div className="snap-ghost merge" style={{ ...grid.pixelRect(merge.block, scale), borderRadius: 10 * scale }}>
                    <span>{merge.block.kind === "group" ? strings.canvas.dropToAddToGroup : strings.canvas.dropToGroup}</span>
                </div>
            );
        }
        if (preview)
        {
            return (
                <div className="snap-ghost" style={{ ...previewGrid.pixelRect(preview.get(draggedBlock.id)!, scale), borderRadius: 10 * scale }}>
                    <span>{drop?.zone === "above" || drop?.zone === "below" ? strings.canvas.dropToNewRow : strings.canvas.dropToSlideIn}</span>
                </div>
            );
        }
        const rect = target(draggedBlock, drag);
        const valid = grid.fits(rect, draggedBlock.id);
        let label = strings.canvas.occupied;
        if (valid)
        {
            label = drag.mode === "move" ? strings.canvas.dropHere : `${rect.w} × ${rect.h}`;
        }
        return (
            <div className={valid ? "snap-ghost" : "snap-ghost occupied"} style={{ ...grid.pixelRect(rect, scale), borderRadius: 10 * scale }}>
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

    return (
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
        </div>
    );
}
