import { useAtom } from "jotai";
import { LayoutLibrary, type SavedLayout } from "../../../layout/LayoutLibrary";
import { ATOMS } from "../../../settings/atoms";

export interface LayoutLibraryActions
{
    layouts: SavedLayout[];
    // The layout last saved or loaded, if it still exists.
    active: SavedLayout | undefined;
    // The clock differs from the active layout (always true without one).
    hasChanges: boolean;
    load: (id: number) => void;
    // Overwrites the active layout with the clock.
    save: () => void;
    saveAsNew: (name: string) => void;
    // Back to the active layout as saved.
    discard: () => void;
    rename: (id: number, name: string) => void;
    duplicate: (id: number, name: string) => void;
    remove: (id: number) => void;
    uniqueName: (name: string) => string;
}

// The saved layouts and the clock's layout together: what the layout switcher and the Saved
// layouts page do. Loading writes CLOCK_LAYOUT, so the layout editor's undo covers it.
export function useLayoutLibrary(): LayoutLibraryActions
{
    const [layouts, setLayouts] = useAtom(ATOMS.SAVED_LAYOUTS);
    const [activeId, setActiveId] = useAtom(ATOMS.ACTIVE_LAYOUT_ID);
    const [layout, setLayout] = useAtom(ATOMS.CLOCK_LAYOUT);
    const library = new LayoutLibrary(layouts);
    const active = library.find(activeId);

    function load(id: number)
    {
        const saved = library.find(id);
        if (saved)
        {
            setLayout(saved.layout);
            setActiveId(id);
        }
    }

    function save()
    {
        if (active)
        {
            setLayouts(library.withSaved(active.id, layout));
        }
    }

    function saveAsNew(name: string)
    {
        const added = library.withNew(name, layout);
        setLayouts(added.layouts);
        setActiveId(added.id);
    }

    function discard()
    {
        if (active)
        {
            setLayout(active.layout);
        }
    }

    function duplicate(id: number, name: string)
    {
        const added = library.withDuplicate(id, name);
        if (added)
        {
            setLayouts(added.layouts);
        }
    }

    function remove(id: number)
    {
        setLayouts(library.without(id));
        if (id === activeId)
        {
            setActiveId(null);
        }
    }

    return {
        layouts,
        active,
        hasChanges: library.hasChanges(activeId, layout),
        load,
        save,
        saveAsNew,
        discard,
        rename: (id, name) => setLayouts(library.withRenamed(id, name)),
        duplicate,
        remove,
        uniqueName: (name) => library.uniqueName(name),
    };
}
