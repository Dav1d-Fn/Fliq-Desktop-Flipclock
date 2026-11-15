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
    onClose: () => void;
    onChange: (update: (current: ClockLayout) => ClockLayout) => void;
    // The column or row bar the popover opens from.
    children: ReactElement;
}

// Settings of one column (width, space after it) or row (height, alignment, space after it),
// opened from its bar on the canvas.
export function TrackPopover({ track, opened, layout, grid, onClose, onChange, children }: TrackPopoverProps)
{
    const strings = useStrings();
    const text = strings.grid;
    const isColumn = track.axis === "column";
    const number = track.index + 1;
    const hasGapAfter = track.index < (isColumn ? layout.columns : layout.rows) - 1;
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

    function renderSize()
    {
        if (isColumn)
        {
            const overridden = grid.columnWidthOverride(track.index) !== null;
            return (
                <InspectorField label={text.width}>
                    <SliderControl
                        label={text.trackSize("column", number)}
                        value={grid.trackSize(track)}
                        onChange={(value) => onChange((current) => new LayoutGrid(current).withColumnWidth(track.index, value))}
                        {...SLIDER_CONFIGS.COLUMN_WIDTH}
                    />
                    {overridden
                        ? <Button variant="subtle" size="compact-xs" onClick={() => onChange((current) => new LayoutGrid(current).withColumnWidth(track.index, null))}>{text.resetToDefault}</Button>
                        : <p className="inspector-note">{text.followsDefault}</p>}
                </InspectorField>
            );
        }
        const overridden = grid.rowHeightOverride(track.index) !== null;
        return (
            <InspectorField label={text.height}>
                <SliderControl
                    label={text.trackSize("row", number)}
                    value={Math.round(grid.trackSize(track))}
                    onChange={(value) => onChange((current) => new LayoutGrid(current).withRowHeight(track.index, value))}
                    {...SLIDER_CONFIGS.ROW_HEIGHT}
                />
                {overridden
                    ? <Button variant="subtle" size="compact-xs" onClick={() => onChange((current) => new LayoutGrid(current).withRowHeight(track.index, null))}>{text.automatic}</Button>
                    : <p className="inspector-note">{text.automaticNote}</p>}
            </InspectorField>
        );
    }

    function renderGapAfter()
    {
        const gap = { axis: track.axis, index: track.index };
        const overridden = grid.gapOverride(gap) !== null;
        return (
            <InspectorField label={text.spaceAfter(track.axis)}>
                <SliderControl
                    label={text.spaceBetween(track.axis, number)}
                    value={grid.gap(gap)}
                    onChange={(value) => onChange((current) => new LayoutGrid(current).withGap(gap, value))}
                    {...SLIDER_CONFIGS.GAP}
                />
                {overridden
                    ? <Button variant="subtle" size="compact-xs" onClick={() => onChange((current) => new LayoutGrid(current).withGap(gap, null))}>{text.resetToDefault}</Button>
                    : <p className="inspector-note">{text.followsDefault}</p>}
            </InspectorField>
        );
    }

    return (
        <Popover
            opened={opened}
            onClose={onClose}
            position={isColumn ? "top" : "left"}
            width={260}
            withArrow
            shadow="md"
            trapFocus={false}
        >
            <Popover.Target>{children}</Popover.Target>
            {/* The dropdown sits in a portal, but React still bubbles its events to the canvas,
                whose pointer down would clear the selection and close it. */}
            <Popover.Dropdown className="track-popover" onPointerDown={(event) => event.stopPropagation()}>
                <div className="track-popover-title">{isColumn ? strings.layout.column(number) : strings.layout.row(number)}</div>
                {renderSize()}
                {!isColumn && (
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
                {hasGapAfter && renderGapAfter()}
            </Popover.Dropdown>
        </Popover>
    );
}
