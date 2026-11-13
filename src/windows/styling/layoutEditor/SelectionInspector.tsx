import { Button } from "@mantine/core";
import { IconStack2, IconTrash } from "@tabler/icons-react";

interface SelectionInspectorProps
{
    count: number;
    // The selected blocks sit side by side in one row, so they can become one group.
    groupable: boolean;
    onGroup: () => void;
    onRemove: () => void;
}

// Settings tab while several blocks are selected (shift/ctrl-click on the canvas).
export function SelectionInspector({ count, groupable, onGroup, onRemove }: SelectionInspectorProps)
{
    return (
        <div className="inspector-body">
            <div className="inspector-heading">
                <h2>{count} blocks</h2>
            </div>
            <p className="inspector-note">
                A group shows its blocks in one row with the same text size, spacing, font and color. Each block keeps
                what it shows.
            </p>
            <Button variant="filled" leftSection={<IconStack2 size={15} />} disabled={!groupable} onClick={onGroup} fullWidth mt={12}>
                Group
            </Button>
            {!groupable && (
                <p className="inspector-note">Only blocks next to each other in the same rows, without a gap between them, can be grouped.</p>
            )}
            <Button className="remove-block" variant="default" c="red.8" leftSection={<IconTrash size={15} />} onClick={onRemove} fullWidth>
                Remove {count} blocks
            </Button>
        </div>
    );
}
