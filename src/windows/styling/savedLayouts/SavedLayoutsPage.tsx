import { Button } from "@mantine/core";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useStrings } from "../../../i18n/useStrings";
import { SavedLayoutCard } from "./SavedLayoutCard";
import { useLayoutLibrary } from "./useLayoutLibrary";

// Clock › Saved layouts: every saved layout as a card. Click loads it, the buttons rename,
// duplicate or delete it.
export function SavedLayoutsPage()
{
    const library = useLayoutLibrary();
    const text = useStrings().savedLayouts;

    return (
        <div className="saved-layouts-page">
            <div className="saved-layouts-header">
                <div>
                    <h1 className="page-title">{text.title}</h1>
                    <p className="page-intro">{text.intro}</p>
                </div>
                <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => library.saveAsNew(library.uniqueName(text.defaultName))}>
                    {text.saveCurrent}
                </Button>
            </div>

            {library.layouts.length === 0 && <p className="saved-layouts-empty">{text.emptyPage}</p>}

            <div className="saved-layouts-grid">
                {library.layouts.map((saved) => (
                    <SavedLayoutCard key={saved.id} saved={saved} library={library} />
                ))}
            </div>
        </div>
    );
}
