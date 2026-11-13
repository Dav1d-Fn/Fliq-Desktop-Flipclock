import type { ComponentType } from "react";
import {
    IconBraces,
    IconCloud,
    IconInfoCircle,
    IconLayoutColumns,
    IconLayoutRows,
    IconPalette,
    IconSettings,
    type Icon,
} from "@tabler/icons-react";
import { AboutPage } from "./pages/AboutPage";
import { AppearancePage } from "./pages/AppearancePage";
import { FlipTimePage } from "./pages/FlipTimePage";
import { FormatTokensPage } from "./pages/FormatTokensPage";
import { GeneralPage } from "./pages/GeneralPage";
import { LinesPage } from "./pages/LinesPage";
import { WeatherPage } from "./pages/WeatherPage";

export type PageId = "appearance" | "lines" | "tokens" | "flip" | "weather" | "general" | "about";

export const PAGE_GROUPS = ["Clock", "Modules", "App"] as const;

export interface PageProps
{
    // Switches to another page, for links between pages.
    navigate: (pageId: PageId) => void;
}

export interface SettingsPage
{
    id: PageId;
    group: typeof PAGE_GROUPS[number];
    label: string;
    icon: Icon;
    // Live preview of the clock above the page.
    showPreview: boolean;
    component: ComponentType<PageProps>;
}

// Every page of the styling window, in sidebar order. A new module gets an entry under "Modules"
// and its placeholder one in FORMAT_TOKENS; nothing else has to change.
export const SETTINGS_PAGES: SettingsPage[] = [
    { id: "appearance", group: "Clock", label: "Appearance", icon: IconPalette, showPreview: true, component: AppearancePage },
    { id: "lines", group: "Clock", label: "Lines & Format", icon: IconLayoutRows, showPreview: true, component: LinesPage },
    { id: "tokens", group: "Clock", label: "Format Tokens", icon: IconBraces, showPreview: false, component: FormatTokensPage },
    { id: "flip", group: "Modules", label: "Flip Time", icon: IconLayoutColumns, showPreview: true, component: FlipTimePage },
    { id: "weather", group: "Modules", label: "Weather", icon: IconCloud, showPreview: false, component: WeatherPage },
    { id: "general", group: "App", label: "General", icon: IconSettings, showPreview: false, component: GeneralPage },
    { id: "about", group: "App", label: "About", icon: IconInfoCircle, showPreview: false, component: AboutPage },
];
