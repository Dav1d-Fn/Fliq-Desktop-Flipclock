import { useEffect, useRef, useState } from "react";
import { ActionIcon, SegmentedControl } from "@mantine/core";
import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react";
import { useAtom } from "jotai";
import { blockDefinition } from "../../../blocks/BlockRegistry";
import { LayoutGrid, type BlockKind, type CellRect, type GapRef, type LayoutBlock, type TrackRef } from "../../../layout/ClockLayout";
import { ATOMS } from "../../../settings/atoms";
import { AddBlockBar } from "./AddBlockBar";
import { BlockInspector } from "./BlockInspector";
import { ClockInspector } from "./ClockInspector";
import { GapInspector } from "./GapInspector";
import { LayoutCanvas } from "./LayoutCanvas";
import { PreviewModeNote } from "./PreviewModeNote";
import { SelectionInspector } from "./SelectionInspector";
import { TrackInspector } from "./TrackInspector";
import { useEditorHistory } from "./useEditorHistory";

type Mode = "edit" | "preview";
// The second tab shows whatever is selected on the canvas: a block, a gap, a column or a row.
type InspectorTab = "clock" | "selection";

const POP_DURATION = 480;
const REMOVE_DURATION = 200;
const SHAKE_DURATION = 450;
const TOAST_DURATION = 2400;

// Clock › Layout: the block editor. Canvas with the real clock in the middle, palette below,
// inspector on the right. Every change is written to the layout setting right away, so the
// clock on the desktop follows live; only a drag in progress stays local to the canvas.
export function LayoutPage()
{
    const [layout, setLayout] = useAtom(ATOMS.CLOCK_LAYOUT);
    const [mode, setMode] = useState<Mode>("edit");
    const [tab, setTab] = useState<InspectorTab>("selection");
    // One block to edit, or several to group (shift/ctrl-click).
    const [selectedIds, setSelectedIds] = useState<number[]>(layout.blocks[0] ? [layout.blocks[0].id] : []);
    const [selectedGap, setSelectedGap] = useState<GapRef | null>(null);
    const [selectedTrack, setSelectedTrack] = useState<TrackRef | null>(null);
    const [poppingId, setPoppingId] = useState<number | null>(null);
    const [removingIds, setRemovingIds] = useState<number[]>([]);
    const [shaking, setShaking] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    // The group member whose settings are open in the inspector.
    const [openMember, setOpenMember] = useState<number | null>(null);
    const timers = useRef<number[]>([]);
    const history = useEditorHistory();

    useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

    function later(action: () => void, delay: number)
    {
        timers.current.push(window.setTimeout(action, delay));
    }

    const editing = mode === "edit";
    // Removed blocks drop out of the selection here, not in every place that removes one.
    const selectedBlocks = layout.blocks.filter((block) => selectedIds.includes(block.id));
    const selectedBlock = selectedBlocks.length === 1 ? selectedBlocks[0] : undefined;
    const multiple = selectedBlocks.length > 1;
    // A gap can vanish when its column or row is removed.
    const gapCount = selectedGap ? (selectedGap.axis === "column" ? layout.columns : layout.rows) - 1 : 0;
    const activeGap = selectedGap && selectedGap.index < gapCount ? selectedGap : null;
    const trackCount = selectedTrack ? (selectedTrack.axis === "column" ? layout.columns : layout.rows) : 0;
    const activeTrack = selectedTrack && selectedTrack.index < trackCount ? selectedTrack : null;
    const hasSelection = selectedBlocks.length > 0 || activeGap !== null || activeTrack !== null;
    const shownTab: InspectorTab = editing && tab === "selection" && hasSelection ? "selection" : "clock";
    let selectionLabel = "Selection";
    if (multiple)
    {
        selectionLabel = `${selectedBlocks.length} blocks`;
    }
    else if (selectedBlock)
    {
        selectionLabel = "Block";
    }
    else if (activeGap)
    {
        selectionLabel = activeGap.axis === "column" ? "Column gap" : "Row gap";
    }
    else if (activeTrack)
    {
        selectionLabel = activeTrack.axis === "column" ? `Column ${activeTrack.index + 1}` : `Row ${activeTrack.index + 1}`;
    }

    function updateBlock(blockId: number, patch: Partial<LayoutBlock>)
    {
        setLayout((current) => ({
            ...current,
            blocks: current.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
        }));
    }

    function select(blockId: number | null, additive = false)
    {
        if (blockId !== null && additive)
        {
            const ids = selectedBlocks.map((block) => block.id);
            setSelectedIds(ids.includes(blockId) ? ids.filter((id) => id !== blockId) : [...ids, blockId]);
        }
        else
        {
            setSelectedIds(blockId === null ? [] : [blockId]);
        }
        setSelectedGap(null);
        setSelectedTrack(null);
        setOpenMember(null);
        if (blockId !== null)
        {
            setTab("selection");
        }
    }

    function selectGap(gap: GapRef)
    {
        setSelectedIds([]);
        setSelectedGap(gap);
        setSelectedTrack(null);
        setTab("selection");
    }

    function selectTrack(track: TrackRef)
    {
        setSelectedIds([]);
        setSelectedGap(null);
        setSelectedTrack(track);
        setTab("selection");
    }

    function complain(message: string)
    {
        setToast(message);
        setShaking(true);
        later(() => setShaking(false), SHAKE_DURATION);
        later(() => setToast(null), TOAST_DURATION);
    }

    function addBlock(kind: BlockKind)
    {
        const definition = blockDefinition(kind);
        const grid = new LayoutGrid(layout);
        const spot = grid.firstFreeSpot([definition.defaultSize, { w: 2, h: 1 }, { w: 1, h: 1 }]);
        if (!spot)
        {
            complain("No space left. Add a column or row first.");
            return;
        }
        const block: LayoutBlock = { id: grid.nextBlockId(), kind, ...definition.defaults, ...spot };
        setLayout({ ...layout, blocks: [...layout.blocks, block] });
        setMode("edit");
        select(block.id);
        setPoppingId(block.id);
        later(() => setPoppingId(null), POP_DURATION);
    }

    // Smaller grids cut blocks back or move them; refused when a block would find no room.
    function resizeGrid(columns: number, rows: number)
    {
        const resized = new LayoutGrid(layout).resized(columns, rows);
        if (!resized)
        {
            complain(columns < layout.columns
                ? "No room for the blocks in the last column. Move or remove one first."
                : "No room for the blocks in the last row. Move or remove one first.");
            return;
        }
        setLayout(resized);
    }

    // Delete / Backspace remove the selected block, unless the key is meant for a text field.
    useEffect(() =>
    {
        const onKeyDown = (event: KeyboardEvent) =>
        {
            if (event.key !== "Delete" && event.key !== "Backspace")
            {
                return;
            }
            const target = event.target as HTMLElement | null;
            if (target?.isContentEditable || target?.closest("input, textarea, select"))
            {
                return;
            }
            if (editing && selectedBlocks.length > 0 && removingIds.length === 0)
            {
                event.preventDefault();
                removeBlocks(selectedBlocks.map((block) => block.id));
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    });

    function removeBlocks(blockIds: number[])
    {
        setRemovingIds(blockIds);
        later(() =>
        {
            setLayout((current) => ({ ...current, blocks: current.blocks.filter((block) => !blockIds.includes(block.id)) }));
            setRemovingIds([]);
            setSelectedIds([]);
        }, REMOVE_DURATION);
    }

    function group()
    {
        const grid = new LayoutGrid(layout);
        const grouped = grid.grouped(selectedBlocks.map((block) => block.id));
        if (!grouped)
        {
            return;
        }
        setLayout(grouped);
        select(grid.nextBlockId());
    }

    // A block dragged onto another in the canvas.
    function merge(targetId: number, droppedId: number, before: boolean)
    {
        const merged = new LayoutGrid(layout).mergedInto(targetId, droppedId, before);
        if (!merged)
        {
            return;
        }
        setLayout(merged);
        select(targetId);
    }

    // Group member menu on the canvas.
    function moveMember(groupId: number, index: number, step: number)
    {
        const moved = new LayoutGrid(layout).withMemberMoved(groupId, index, step);
        if (moved)
        {
            setLayout(moved);
            setOpenMember(null);
        }
    }

    function detachMember(groupId: number, index: number)
    {
        const group = layout.blocks.find((block) => block.id === groupId);
        const item = group?.items?.[index];
        if (!item)
        {
            return;
        }
        const detached = new LayoutGrid(layout).withMemberDetached(groupId, index, [blockDefinition(item.kind).defaultSize, { w: 2, h: 1 }, { w: 1, h: 1 }]);
        if (!detached)
        {
            complain("No space left. Add a column or row first.");
            return;
        }
        setLayout(detached.layout);
        select(detached.blockId);
        setPoppingId(detached.blockId);
        later(() => setPoppingId(null), POP_DURATION);
    }

    function openMemberSettings(groupId: number, index: number)
    {
        select(groupId);
        setOpenMember(index);
    }

    function ungroup(groupId: number)
    {
        const grid = new LayoutGrid(layout);
        const ungrouped = grid.ungrouped(groupId);
        if (!ungrouped)
        {
            complain("The group has more items than cells. Make it wider first.");
            return;
        }
        const firstNewId = grid.nextBlockId();
        setLayout(ungrouped);
        setSelectedIds(ungrouped.blocks.filter((block) => block.id >= firstNewId).map((block) => block.id));
    }

    return (
        <div className="layout-page">
            <main className="layout-main">
                <div className="layout-header">
                    <div>
                        <h1 className="page-title">Layout</h1>
                        <p className="page-intro">Drag blocks to move them. Pull the green handles to resize. Click between two rows or columns to change the space, or the bar above a column or beside a row to size it. Drop a block onto another to group them, or shift-click blocks side by side.</p>
                    </div>
                    <div className="layout-header-actions">
                        <ActionIcon variant="default" size={34} aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!history.canUndo} onClick={history.undo}>
                            <IconArrowBackUp size={18} />
                        </ActionIcon>
                        <ActionIcon variant="default" size={34} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled={!history.canRedo} onClick={history.redo}>
                            <IconArrowForwardUp size={18} />
                        </ActionIcon>
                        <SegmentedControl
                            aria-label="Mode"
                            value={mode}
                            onChange={(value) => setMode(value as Mode)}
                            data={[
                                { value: "edit", label: "Edit" },
                                { value: "preview", label: "Preview" },
                            ]}
                        />
                    </div>
                </div>

                <LayoutCanvas
                    layout={layout}
                    editing={editing}
                    selectedIds={selectedBlocks.map((block) => block.id)}
                    selectedGap={activeGap}
                    poppingId={poppingId}
                    removingIds={removingIds}
                    shaking={shaking}
                    toast={toast}
                    onSelect={select}
                    onSelectGap={selectGap}
                    selectedTrack={activeTrack}
                    onSelectTrack={selectTrack}
                    onPlace={(blockId: number, rect: CellRect) => updateBlock(blockId, rect)}
                    onMerge={merge}
                    onMoveMember={moveMember}
                    onDetachMember={detachMember}
                    onOpenMember={openMemberSettings}
                />

                <AddBlockBar
                    layout={layout}
                    onAdd={addBlock}
                    onResizeGrid={resizeGrid}
                />
            </main>

            <aside className="inspector" aria-label="Block settings">
                {editing && (
                    <SegmentedControl
                        fullWidth
                        mb={18}
                        value={shownTab}
                        onChange={(value) => setTab(value as InspectorTab)}
                        data={[
                            { value: "clock", label: "Whole clock" },
                            { value: "selection", label: selectionLabel, disabled: !hasSelection },
                        ]}
                    />
                )}
                {!editing && <PreviewModeNote />}
                {shownTab === "selection" && selectedBlock && (
                    <BlockInspector
                        key={selectedBlock.id}
                        layout={layout}
                        block={selectedBlock}
                        onChange={(patch) => updateBlock(selectedBlock.id, patch)}
                        onRemove={() => removeBlocks([selectedBlock.id])}
                        onUngroup={() => ungroup(selectedBlock.id)}
                        openMember={openMember}
                        onOpenMember={setOpenMember}
                    />
                )}
                {shownTab === "selection" && multiple && (
                    <SelectionInspector
                        count={selectedBlocks.length}
                        groupable={new LayoutGrid(layout).groupable(selectedBlocks.map((block) => block.id)) !== null}
                        onGroup={group}
                        onRemove={() => removeBlocks(selectedBlocks.map((block) => block.id))}
                    />
                )}
                {shownTab === "selection" && activeGap && (
                    <GapInspector
                        gap={activeGap}
                        value={new LayoutGrid(layout).gap(activeGap)}
                        overridden={new LayoutGrid(layout).gapOverride(activeGap) !== null}
                        onChange={(value) => setLayout((current) => new LayoutGrid(current).withGap(activeGap, value))}
                    />
                )}
                {shownTab === "selection" && activeTrack && (
                    <TrackInspector
                        track={activeTrack}
                        value={new LayoutGrid(layout).trackSize(activeTrack)}
                        overridden={new LayoutGrid(layout).trackOverride(activeTrack) !== null}
                        onChange={(value) => setLayout((current) => new LayoutGrid(current).withTrackSize(activeTrack, value))}
                    />
                )}
                {editing && shownTab === "clock" && <ClockInspector />}
            </aside>
        </div>
    );
}
