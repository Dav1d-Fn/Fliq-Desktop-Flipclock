import { ReactElement } from "react";
import { Button, Popover, SegmentedControl } from "@mantine/core";
import { useWindowEvent } from "@mantine/hooks";
import { IconLayoutAlignBottom, IconLayoutAlignMiddle, IconLayoutAlignTop } from "@tabler/icons-react";
import { LayoutGrid, type ClockLayout, type RowAlign, type TrackRef } from "../../../layout/ClockLayout";
import { SLIDER_CONFIGS } from "../../../settings/options";
import { SliderControl } from "../controls/SliderControl";
import { useStrings } from "../../../i18n/useStrings";
import { InspectorField } from "./InspectorField";

interface TrackPopoverProps
{
    track: TrackRef;
    opened: boolean;
    layout: ClockLayout;
    // The canvas grid, with the measured row heights the automatic rows have right now.
    grid: LayoutGrid;
    // Natural height of each block (px at scale 1, by id), as the clock measured it.
    blockHeights: Record<number, number>;
    onClose: () => void;
    onChange: (update: (current: ClockLayout) => ClockLayout) => void;
    // The column or row bar the popover opens from.
    children: ReactElement;
}

// Least room the dropdown keeps to the window edge, in px.
const WINDOW_EDGE_PADDING = 8;

// Settings of one column (width) or row (minimum height, alignment), opened from its bar on
// the canvas. Gaps are whole-clock settings, not set here.
export function TrackPopover({ track, opened, layout, grid, blockHeights, onClose, onChange, children }: TrackPopoverProps)
{
    const strings = useStrings();
    const text = strings.grid;
    const isColumn = track.axis === "column";
    const number = track.index + 1;
    const alignData = [
        { value: "top", label: <IconLayoutAlignTop size={16} aria-label={strings.row.top} /> },
        { value: "center", label: <IconLayoutAlignMiddle size={16} aria-label={strings.row.center} /> },
        { value: "bottom", label: <IconLayoutAlignBottom size={16} aria-label={strings.row.bottom} /> },
    ];

    // Mantine closes on Escape only while focus is inside the dropdown; a reset button that
    // just disappeared leaves it on the page, so listen on the window.
    useWindowEvent("keydown", (event) =>
    {
        if (opened && event.key === "Escape")
        {
            onClose();
        }
    });

    function renderColumn()
    {
        const overridden = grid.columnWidthOverride(track.index) !== null;
        return (
            <InspectorField label={text.width} help={text.followsDefault}>
                <SliderControl
                    label={text.trackSize("column", number)}
                    value={grid.trackSize(track)}
                    onChange={(value) => onChange((current) => new LayoutGrid(current).withColumnWidth(track.index, value))}
                    {...SLIDER_CONFIGS.COLUMN_WIDTH}
                />
                {overridden && (
                    <Button variant="subtle" size="compact-xs" onClick={() => onChange((current) => new LayoutGrid(current).withColumnWidth(track.index, null))}>
                        {text.resetToDefault}
                    </Button>
                )}
            </InspectorField>
        );
    }

    function renderRow()
    {
        // The minimum where one is set (the row may be higher), else the height it has now.
        const minimum = grid.rowHeightOverride(track.index);
        const showsAlign = LayoutGrid.rowHasRoomToAlign(layout, blockHeights, track.index);
        return (
            <>
                <InspectorField label={text.height} help={text.automaticNote}>
                    <SliderControl
                        label={text.trackSize("row", number)}
                        value={Math.round(minimum ?? grid.trackSize(track))}
                        onChange={(value) => onChange((current) => new LayoutGrid(current).withRowHeight(track.index, value))}
                        {...SLIDER_CONFIGS.ROW_HEIGHT}
                    />
                    {minimum !== null && (
                        <Button variant="subtle" size="compact-xs" onClick={() => onChange((current) => new LayoutGrid(current).withRowHeight(track.index, null))}>
                            {text.automatic}
                        </Button>
                    )}
                </InspectorField>
                {showsAlign && (
                    <InspectorField label={strings.row.alignLabel}>
                        <SegmentedControl
                            fullWidth
                            size="xs"
                            data={alignData}
                            value={grid.rowAlign(track.index)}
                            onChange={(align) => onChange((current) => new LayoutGrid(current).withRowAlign(track.index, align as RowAlign))}
                        />
                    </InspectorField>
                )}
            </>
        );
    }

    return (
        <Popover
            opened={opened}
            onClose={onClose}
            position={isColumn ? "top" : "left"}
            width={240}
            withArrow
            shadow="md"
            trapFocus={false}
            // Flip to the other side and slide along the edge rather than leave the window.
            middlewares={{ flip: true, shift: { padding: WINDOW_EDGE_PADDING } }}
        >
            <Popover.Target>{children}</Popover.Target>
            {/* The dropdown sits in a portal, but React still bubbles its events to the canvas,
                whose pointer down would clear the selection and close it. */}
            <Popover.Dropdown className="track-popover" onPointerDown={(event) => event.stopPropagation()}>
                <div className="track-popover-title">{isColumn ? strings.layout.column(number) : strings.layout.row(number)}</div>
                {isColumn ? renderColumn() : renderRow()}
            </Popover.Dropdown>
        </Popover>
    );
}
