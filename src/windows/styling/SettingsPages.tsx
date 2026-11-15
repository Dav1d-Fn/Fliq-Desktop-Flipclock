import type { ComponentType } from "react";
import { IconClock, IconCloud, IconInfoCircle, IconLayoutDashboard, IconLayoutList, IconSettings, type Icon } from "@tabler/icons-react";
import { LayoutPage } from "./layoutEditor/LayoutPage";
import { AboutPage } from "./pages/AboutPage";
import { GeneralPage } from "./pages/GeneralPage";
import { TimePage } from "./pages/TimePage";
import { WeatherPage } from "./pages/WeatherPage";
import { SavedLayoutsPage } from "./savedLayouts/SavedLayoutsPage";

export type PageId = "layout" | "savedLayouts" | "time" | "weather" | "general" | "about";

export const PAGE_GROUPS = ["Clock", "Data", "App"] as const;

export interface PageProps
{
    // Opens another page (the layout switcher's "Manage" link).
    onNavigate: (pageId: PageId) => void;
}

export interface SettingsPage
{
    id: PageId;
    // Shown as `sidebar.groups[group]` and `sidebar.pages[id]` of the dictionary.
    group: typeof PAGE_GROUPS[number];
    icon: Icon;
    // Fills the whole main area instead of the centered page column.
    wide: boolean;
    component: ComponentType<PageProps>;
}

// Every page of the settings window, in sidebar order. Everything visual lives in the layout
// editor; a new block kind needs no page, data a block uses (like the weather location) goes
// under "Data".
export const SETTINGS_PAGES: SettingsPage[] = [
    { id: "layout", group: "Clock", icon: IconLayoutDashboard, wide: true, component: LayoutPage },
    { id: "savedLayouts", group: "Clock", icon: IconLayoutList, wide: false, component: SavedLayoutsPage },
    { id: "time", group: "Data", icon: IconClock, wide: false, component: TimePage },
    { id: "weather", group: "Data", icon: IconCloud, wide: false, component: WeatherPage },
    { id: "general", group: "App", icon: IconSettings, wide: false, component: GeneralPage },
    { id: "about", group: "App", icon: IconInfoCircle, wide: false, component: AboutPage },
];
