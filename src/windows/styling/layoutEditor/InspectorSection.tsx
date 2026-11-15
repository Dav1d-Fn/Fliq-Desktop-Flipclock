import type { ReactNode } from "react";
import { UnstyledButton } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { IconChevronDown } from "@tabler/icons-react";

interface InspectorSectionProps
{
    // Remembers open or closed under this id, for every block alike.
    id: string;
    title: string;
    // Shown in the header while closed: the most telling values, short.
    summary?: ReactNode;
    defaultOpen: boolean;
    children: ReactNode;
}

// Window state, not a setting: kept apart from the atoms (and from tuxhub).
const STORAGE_KEY = "inspectorSections";

// A collapsible part of the inspector. Open or closed stays as the user left it.
export function InspectorSection({ id, title, summary, defaultOpen, children }: InspectorSectionProps)
{
    const [openSections, setOpenSections] = useLocalStorage<Record<string, boolean>>({ key: STORAGE_KEY, defaultValue: {} });
    const open = openSections[id] ?? defaultOpen;
    const bodyId = `inspector-section-${id}`;

    return (
        <section className={open ? "inspector-section open" : "inspector-section"}>
            <UnstyledButton
                className="inspector-section-header"
                aria-expanded={open}
                aria-controls={bodyId}
                onClick={() => setOpenSections((current) => ({ ...current, [id]: !open }))}
            >
                <span className="inspector-section-title">{title}</span>
                {!open && summary && <span className="inspector-section-summary">{summary}</span>}
                <IconChevronDown className="inspector-section-chevron" size={16} />
            </UnstyledButton>
            {open && (
                <div className="inspector-section-body" id={bodyId}>
                    {children}
                </div>
            )}
        </section>
    );
}
