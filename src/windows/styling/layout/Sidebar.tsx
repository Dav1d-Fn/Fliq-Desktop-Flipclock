import { PAGE_GROUPS, SETTINGS_PAGES, type PageId } from "../SettingsPages";
import { useAppVersion } from "../useAppVersion";
import { FliqLogo } from "./FliqLogo";

interface SidebarProps
{
    currentPage: PageId;
    onNavigate: (pageId: PageId) => void;
}

// Navigation: the pages of SETTINGS_PAGES, grouped.
export function Sidebar({ currentPage, onNavigate }: SidebarProps)
{
    const version = useAppVersion();

    return (
        <nav className="styling-sidebar" aria-label="Settings sections">
            <div className="sidebar-brand">
                <FliqLogo size={30} />
                <div>
                    <div className="sidebar-brand-name">Fliq</div>
                    <div className="sidebar-brand-sub">Settings</div>
                </div>
            </div>

            {PAGE_GROUPS.map((group) => (
                <div key={group}>
                    <div className="nav-group">{group}</div>
                    {SETTINGS_PAGES.filter((page) => page.group === group).map((page) => (
                        <button
                            key={page.id}
                            type="button"
                            className="nav-item"
                            aria-current={page.id === currentPage ? "page" : undefined}
                            onClick={() => onNavigate(page.id)}
                        >
                            <page.icon size={17} stroke={1.8} />
                            {page.label}
                        </button>
                    ))}
                </div>
            ))}

            {version && <div className="sidebar-version">Version {version}</div>}
        </nav>
    );
}
