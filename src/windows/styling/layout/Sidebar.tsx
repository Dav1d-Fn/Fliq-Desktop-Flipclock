import { useAtomValue } from "jotai";
import { useStrings } from "../../../i18n/useStrings";
import { ATOMS } from "../../../settings/atoms";
import { PAGE_GROUPS, SETTINGS_PAGES, type PageId } from "../SettingsPages";
import { useAppVersion } from "../useAppVersion";
import { FliqLogo } from "./FliqLogo";

interface SidebarProps
{
    currentPage: PageId;
    onNavigate: (pageId: PageId) => void;
}

// Navigation: the pages of SETTINGS_PAGES, grouped. Saved layouts shows how many there are.
export function Sidebar({ currentPage, onNavigate }: SidebarProps)
{
    const version = useAppVersion();
    const strings = useStrings();
    const savedLayoutCount = useAtomValue(ATOMS.SAVED_LAYOUTS).length;

    return (
        <nav className="styling-sidebar" aria-label={strings.sidebar.ariaLabel}>
            <div className="sidebar-brand">
                <FliqLogo size={30} />
                <div>
                    <div className="sidebar-brand-name">Fliq</div>
                    <div className="sidebar-brand-sub">{strings.sidebar.subtitle}</div>
                </div>
            </div>

            {PAGE_GROUPS.map((group) => (
                <div key={group}>
                    <div className="nav-group">{strings.sidebar.groups[group]}</div>
                    {SETTINGS_PAGES.filter((page) => page.group === group).map((page) => (
                        <button
                            key={page.id}
                            type="button"
                            className="nav-item"
                            aria-current={page.id === currentPage ? "page" : undefined}
                            onClick={() => onNavigate(page.id)}
                        >
                            <page.icon size={17} stroke={1.8} />
                            {strings.sidebar.pages[page.id]}
                            {page.id === "savedLayouts" && savedLayoutCount > 0 && <span className="nav-count">{savedLayoutCount}</span>}
                        </button>
                    ))}
                </div>
            ))}

            {version && <div className="sidebar-version">{strings.sidebar.version(version)}</div>}
        </nav>
    );
}
