import "@mantine/core/styles.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./styling.css";
import "./layoutEditor/layoutEditor.css";

import { useEffect, useRef, useState } from "react";
import { MantineProvider } from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";
import { useAtomValue } from "jotai";
import { ATOMS } from "../../settings/atoms";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useStrings } from "../../i18n/useStrings";
import { Sidebar } from "./layout/Sidebar";
import { TitleBar } from "./layout/TitleBar";
import { SETTINGS_PAGES, type PageId } from "./SettingsPages";
import { stylingTheme } from "./theme";

// The settings window: sidebar with the pages of SETTINGS_PAGES, the current page on the right.
// Every page reads and writes the settings atoms directly; the clock window follows through the
// shared localStorage.
export default function StylingApp()
{
    const [currentPageId, setCurrentPageId] = useState<PageId>("layout");
    const mainRef = useRef<HTMLElement>(null);
    const strings = useStrings();
    const chosenColorScheme = useAtomValue(ATOMS.SETTINGS_COLOR_SCHEME);
    const systemColorScheme = useColorScheme("light", { getInitialValueInEffect: false });
    const colorScheme = chosenColorScheme === "auto" ? systemColorScheme : chosenColorScheme;

    // The window title follows the language too.
    useEffect(() =>
    {
        document.title = strings.windowTitle;
        // Inside a promise, so a missing Tauri runtime (browser preview) only rejects it.
        Promise.resolve()
            .then(() => getCurrentWindow().setTitle(strings.windowTitle))
            .catch(() => undefined);
    }, [strings.windowTitle]);

    const currentPage = SETTINGS_PAGES.find((page) => page.id === currentPageId) ?? SETTINGS_PAGES[0];
    const PageComponent = currentPage.component;

    function navigate(pageId: PageId)
    {
        setCurrentPageId(pageId);
        mainRef.current?.scrollTo({ top: 0 });
    }

    return (
        <MantineProvider theme={stylingTheme} forceColorScheme={colorScheme}>
            <div className="styling-frame">
                <TitleBar />
                <div className="styling-window">
                    <Sidebar currentPage={currentPage.id} onNavigate={navigate} />
                    <main className={currentPage.wide ? "styling-main wide" : "styling-main"} ref={mainRef}>
                        {currentPage.wide
                            ? <PageComponent onNavigate={navigate} />
                            : (
                                <div className="styling-page">
                                    <PageComponent onNavigate={navigate} />
                                </div>
                            )}
                    </main>
                </div>
            </div>
        </MantineProvider>
    );
}
