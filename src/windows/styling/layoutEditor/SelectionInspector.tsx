import { Button } from "@mantine/core";
import { IconStack2, IconTrash } from "@tabler/icons-react";
import { useStrings } from "../../../i18n/useStrings";

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
    const text = useStrings().selection;

    return (
        <div className="inspector-body">
            <div className="inspector-heading">
                <h2>{text.heading(count)}</h2>
            </div>
            <p className="inspector-note">{text.note}</p>
            <Button variant="filled" leftSection={<IconStack2 size={15} />} disabled={!groupable} onClick={onGroup} fullWidth mt={12}>
                {text.group}
            </Button>
            {!groupable && (
                <p className="inspector-note">{text.notGroupable}</p>
            )}
            <Button className="remove-block" variant="default" c="red.8" leftSection={<IconTrash size={15} />} onClick={onRemove} fullWidth>
                {text.remove(count)}
            </Button>
        </div>
    );
}
