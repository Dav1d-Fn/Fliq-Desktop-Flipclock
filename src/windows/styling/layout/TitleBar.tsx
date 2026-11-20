import { useEffect, useState } from "react";
import { IconCopy, IconMinus, IconSquare, IconX } from "@tabler/icons-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useStrings } from "../../../i18n/useStrings";

// Runs a window call; without a Tauri runtime (browser preview) the call only rejects.
function withWindow(action: (window: ReturnType<typeof getCurrentWindow>) => Promise<unknown>)
{
    Promise.resolve()
        .then(() => action(getCurrentWindow()))
        .catch(() => undefined);
}

// The settings window draws its own title bar instead of the system's, so it follows the
// light and dark scheme. The empty area drags the window, a double click maximizes it.
export function TitleBar()
{
    const strings = useStrings();
    const [isMaximized, setIsMaximized] = useState(false);

    // The maximize button shows "restore" while the window is maximized.
    useEffect(() =>
    {
        let stopListening: (() => void) | undefined;
        let isUnmounted = false;
        withWindow(async (window) =>
        {
            setIsMaximized(await window.isMaximized());
            const unlisten = await window.onResized(async () =>
            {
                setIsMaximized(await window.isMaximized());
            });
            if (isUnmounted)
            {
                unlisten();
                return;
            }
            stopListening = unlisten;
        });
        return () =>
        {
            isUnmounted = true;
            stopListening?.();
        };
    }, []);

    return (
        <header className="title-bar" data-tauri-drag-region>
            <span className="title-bar-title" data-tauri-drag-region>{strings.windowTitle}</span>
            <div className="title-bar-buttons">
                <button
                    type="button"
                    className="title-bar-button"
                    aria-label={strings.titleBar.minimize}
                    title={strings.titleBar.minimize}
                    onClick={() => withWindow((window) => window.minimize())}
                >
                    <IconMinus size={16} stroke={1.6} />
                </button>
                <button
                    type="button"
                    className="title-bar-button"
                    aria-label={isMaximized ? strings.titleBar.restore : strings.titleBar.maximize}
                    title={isMaximized ? strings.titleBar.restore : strings.titleBar.maximize}
                    onClick={() => withWindow((window) => window.toggleMaximize())}
                >
                    {isMaximized ? <IconCopy size={14} stroke={1.6} /> : <IconSquare size={14} stroke={1.6} />}
                </button>
                <button
                    type="button"
                    className="title-bar-button close"
                    aria-label={strings.titleBar.close}
                    title={strings.titleBar.close}
                    onClick={() => withWindow((window) => window.close())}
                >
                    <IconX size={16} stroke={1.6} />
                </button>
            </div>
        </header>
    );
}
