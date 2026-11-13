import type { ComponentType } from "react";
import { IconClock, IconCloud, IconInfoCircle, IconLayoutDashboard, IconSettings, type Icon } from "@tabler/icons-react";
import { LayoutPage } from "./layoutEditor/LayoutPage";
import { AboutPage } from "./pages/AboutPage";
import { GeneralPage } from "./pages/GeneralPage";
import { TimePage } from "./pages/TimePage";
import { WeatherPage } from "./pages/WeatherPage";

export type PageId = "layout" | "time" | "weather" | "general" | "about";

export const PAGE_GROUPS = ["Clock", "Data", "App"] as const;

export interface SettingsPage
{
    id: PageId;
    group: typeof PAGE_GROUPS[number];
    label: string;
    icon: Icon;
    // Fills the whole main area instead of the centered page column.
    wide: boolean;
    component: ComponentType;
}

// Every page of the styling window, in sidebar order. Everything visual lives in the layout
// editor; a new block kind needs no page, data a block uses (like the weather location) goes
// under "Data".
export const SETTINGS_PAGES: SettingsPage[] = [
    { id: "layout", group: "Clock", label: "Layout", icon: IconLayoutDashboard, wide: true, component: LayoutPage },
    { id: "time", group: "Data", label: "Time", icon: IconClock, wide: false, component: TimePage },
    { id: "weather", group: "Data", label: "Weather", icon: IconCloud, wide: false, component: WeatherPage },
    { id: "general", group: "App", label: "General", icon: IconSettings, wide: false, component: GeneralPage },
    { id: "about", group: "App", label: "About", icon: IconInfoCircle, wide: false, component: AboutPage },
];
