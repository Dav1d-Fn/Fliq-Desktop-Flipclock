import { useState } from "react";
import { Button, Popover, TextInput, UnstyledButton } from "@mantine/core";
import { IconArrowBackUp, IconCheck, IconChevronDown, IconDeviceFloppy, IconPlus } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { useStrings } from "../../../i18n/useStrings";
import { ATOMS } from "../../../settings/atoms";
import { LayoutThumbnail } from "./LayoutThumbnail";
import { useLayoutLibrary } from "./useLayoutLibrary";

interface LayoutSwitcherProps
{
    // Opens the Saved layouts page.
    onManage: () => void;
}

// Next to the Layout title: which saved layout the clock shows, whether it changed since, a
// menu to load another or save as new, and the Save button.
export function LayoutSwitcher({ onManage }: LayoutSwitcherProps)
{
    const library = useLayoutLibrary();
    const layout = useAtomValue(ATOMS.CLOCK_LAYOUT);
    const strings = useStrings();
    const text = strings.savedLayouts;
    const [opened, setOpened] = useState(false);
    // The "Save as new" name field; null while closed.
    const [newName, setNewName] = useState<string | null>(null);

    function close()
    {
        setOpened(false);
        setNewName(null);
    }

    function openSaveAs()
    {
        setOpened(true);
        setNewName(library.uniqueName(library.active ? text.copyOf(library.active.name) : text.defaultName));
    }

    function saveAsNew()
    {
        if (newName?.trim())
        {
            library.saveAsNew(newName);
            close();
        }
    }

    function manage()
    {
        close();
        onManage();
    }

    // Without a saved layout, Save means "Save as new".
    function onSave()
    {
        if (library.active)
        {
            library.save();
        }
        else
        {
            openSaveAs();
        }
    }

    return (
        <div className="layout-switcher">
            <Popover opened={opened} onChange={(open) => (open ? setOpened(true) : close())} position="bottom-start" width={320} shadow="md" radius="md">
                <Popover.Target>
                    <UnstyledButton
                        className="layout-switcher-button"
                        aria-haspopup="dialog"
                        aria-expanded={opened}
                        onClick={() => (opened ? close() : setOpened(true))}
                    >
                        <LayoutThumbnail layout={layout} size={30} />
                        <span className="layout-switcher-text">
                            <strong>{library.active?.name ?? text.unsaved}</strong>
                            {library.active && library.hasChanges && (
                                <span className="layout-switcher-changes"><i />{text.unsavedChanges}</span>
                            )}
                        </span>
                        <IconChevronDown size={16} />
                    </UnstyledButton>
                </Popover.Target>
                <Popover.Dropdown p={6}>
                    <div className="layout-menu-heading">
                        <span>{text.menuHeading}</span>
                        <button type="button" className="text-link" onClick={manage}>{text.manage}</button>
                    </div>
                    {library.layouts.length === 0 && <p className="layout-menu-empty">{text.empty}</p>}
                    {library.layouts.map((saved) => (
                        <UnstyledButton
                            key={saved.id}
                            className="layout-menu-item"
                            onClick={() =>
                            {
                                library.load(saved.id);
                                close();
                            }}
                        >
                            <LayoutThumbnail layout={saved.layout} size={34} />
                            <span className="layout-menu-item-text">
                                <strong>{saved.name}</strong>
                                <span>{text.meta(saved.layout.columns, saved.layout.rows, saved.layout.blocks.length)}</span>
                            </span>
                            {saved.id === library.active?.id && <IconCheck size={16} className="layout-menu-check" aria-label={text.inUse} />}
                        </UnstyledButton>
                    ))}
                    <div className="layout-menu-divider" />
                    {newName === null
                        ? (
                            <UnstyledButton className="layout-menu-action" onClick={openSaveAs}>
                                <IconPlus size={16} />
                                {text.saveAsNew}
                            </UnstyledButton>
                        )
                        : (
                            <form
                                className="layout-menu-save-as"
                                onSubmit={(event) =>
                                {
                                    event.preventDefault();
                                    saveAsNew();
                                }}
                            >
                                <TextInput
                                    label={text.name}
                                    value={newName}
                                    onChange={(event) => setNewName(event.currentTarget.value)}
                                    data-autofocus
                                    autoFocus
                                    size="xs"
                                    flex={1}
                                />
                                <Button type="submit" size="xs" disabled={!newName.trim()}>{text.save}</Button>
                            </form>
                        )}
                    {library.active && (
                        <UnstyledButton
                            className="layout-menu-action"
                            disabled={!library.hasChanges}
                            onClick={() =>
                            {
                                library.discard();
                                close();
                            }}
                        >
                            <IconArrowBackUp size={16} />
                            {text.discard}
                        </UnstyledButton>
                    )}
                </Popover.Dropdown>
            </Popover>
            <Button
                variant={library.active && library.hasChanges ? "filled" : "default"}
                leftSection={<IconDeviceFloppy size={16} />}
                disabled={Boolean(library.active) && !library.hasChanges}
                onClick={onSave}
            >
                {text.save}
            </Button>
        </div>
    );
}
