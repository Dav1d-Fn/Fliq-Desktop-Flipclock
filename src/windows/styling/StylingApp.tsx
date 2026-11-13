import "@mantine/core/styles.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./styling.css";

import { useRef, useState } from "react";
import { MantineProvider } from "@mantine/core";
import { LivePreview } from "./layout/LivePreview";
import { Sidebar } from "./layout/Sidebar";
import { SETTINGS_PAGES, type PageId } from "./SettingsPages";
import { stylingTheme } from "./theme";

// The styling window: sidebar with the pages of SETTINGS_PAGES, the current page on the right.
// Every page reads and writes the settings atoms directly; the clock window follows through the
// shared localStorage.
export default function StylingApp()
{
    const [currentPageId, setCurrentPageId] = useState<PageId>("appearance");
    const mainRef = useRef<HTMLElement>(null);

    const currentPage = SETTINGS_PAGES.find((page) => page.id === currentPageId) ?? SETTINGS_PAGES[0];
    const PageComponent = currentPage.component;

    function navigate(pageId: PageId)
    {
        setCurrentPageId(pageId);
        mainRef.current?.scrollTo({ top: 0 });
    }

    return (
        <MantineProvider theme={stylingTheme} forceColorScheme="light">
            <div className="styling-window">
                <Sidebar currentPage={currentPage.id} onNavigate={navigate} />
                <main className="styling-main" ref={mainRef}>
                    <div className="styling-page">
                        {currentPage.showPreview && <LivePreview />}
                        <PageComponent navigate={navigate} />
                    </div>
                </main>
            </div>
        </MantineProvider>
    );
}
