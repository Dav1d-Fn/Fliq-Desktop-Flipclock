import { useState } from "react";
import { ActionIcon, Badge, Button, Popover, TextInput, UnstyledButton } from "@mantine/core";
import { IconCopy, IconPencil, IconTrash } from "@tabler/icons-react";
import { useStrings } from "../../../i18n/useStrings";
import type { SavedLayout } from "../../../layout/LayoutLibrary";
import { LayoutThumbnail } from "./LayoutThumbnail";
import type { LayoutLibraryActions } from "./useLayoutLibrary";

interface SavedLayoutCardProps
{
    saved: SavedLayout;
    library: LayoutLibraryActions;
}

// One saved layout on the Saved layouts page.
export function SavedLayoutCard({ saved, library }: SavedLayoutCardProps)
{
    const text = useStrings().savedLayouts;
    const active = saved.id === library.active?.id;
    // The name field while renaming; null otherwise.
    const [draftName, setDraftName] = useState<string | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    function finishRename()
    {
        if (draftName !== null)
        {
            library.rename(saved.id, draftName);
            setDraftName(null);
        }
    }

    return (
        <article className={active ? "saved-layout-card active" : "saved-layout-card"}>
            <UnstyledButton className="saved-layout-preview" aria-label={text.load(saved.name)} onClick={() => library.load(saved.id)}>
                <LayoutThumbnail layout={saved.layout} width={198} height={118} />
            </UnstyledButton>
            <div className="saved-layout-footer">
                <div className="saved-layout-text">
                    {draftName === null
                        ? (
                            <div className="saved-layout-name">
                                <strong>{saved.name}</strong>
                                {active && <Badge className="saved-layout-badge" size="sm" variant="light" radius="xl">{text.inUse}</Badge>}
                            </div>
                        )
                        : (
                            <TextInput
                                size="xs"
                                aria-label={text.name}
                                value={draftName}
                                autoFocus
                                onChange={(event) => setDraftName(event.currentTarget.value)}
                                onBlur={finishRename}
                                onKeyDown={(event) =>
                                {
                                    if (event.key === "Enter")
                                    {
                                        finishRename();
                                    }
                                    else if (event.key === "Escape")
                                    {
                                        setDraftName(null);
                                    }
                                }}
                            />
                        )}
                    <span className="saved-layout-meta">{text.meta(saved.layout.columns, saved.layout.rows, saved.layout.blocks.length)}</span>
                </div>
                <ActionIcon variant="subtle" color="gray" aria-label={text.rename(saved.name)} title={text.rename(saved.name)} onClick={() => setDraftName(saved.name)}>
                    <IconPencil size={16} />
                </ActionIcon>
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label={text.duplicate(saved.name)}
                    title={text.duplicate(saved.name)}
                    onClick={() => library.duplicate(saved.id, library.uniqueName(text.copyOf(saved.name)))}
                >
                    <IconCopy size={16} />
                </ActionIcon>
                <Popover opened={confirmingDelete} onChange={setConfirmingDelete} position="top-end" withArrow shadow="md" width={240}>
                    <Popover.Target>
                        <ActionIcon variant="subtle" color="red" aria-label={text.remove(saved.name)} title={text.remove(saved.name)} onClick={() => setConfirmingDelete((open) => !open)}>
                            <IconTrash size={16} />
                        </ActionIcon>
                    </Popover.Target>
                    <Popover.Dropdown>
                        <p className="saved-layout-confirm">{text.removeConfirm(saved.name)}</p>
                        <div className="saved-layout-confirm-actions">
                            <Button size="xs" variant="default" onClick={() => setConfirmingDelete(false)}>{text.cancel}</Button>
                            <Button size="xs" color="red" onClick={() => library.remove(saved.id)}>{text.removeButton}</Button>
                        </div>
                    </Popover.Dropdown>
                </Popover>
            </div>
        </article>
    );
}
