import { Switch } from "@mantine/core";
import { useAtom } from "jotai";
import { ATOMS } from "../../../settings/atoms";
import { SettingRow } from "../controls/SettingRow";

// Autostart, taskbar and always-on-top as switches. Embedded in tuxhub only: there the clock
// applies them when the value arrives. In Fliq's own settings window they stay in the clock's
// right-click menu, because the system calls behind them belong to the clock window.
export function WindowToggles()
{
    const [autostart, setAutostart] = useAtom(ATOMS.AUTOSTART);
    const [hideInTaskbar, setHideInTaskbar] = useAtom(ATOMS.HIDE_IN_TASKBAR);
    const [alwaysOnTop, setAlwaysOnTop] = useAtom(ATOMS.ALWAYS_ON_TOP);

    return (
        <>
            <SettingRow label="Autostart" description="Start Fliq when you log in.">
                <Switch
                    aria-label="Autostart"
                    checked={autostart}
                    onChange={(event) => setAutostart(event.currentTarget.checked)}
                />
            </SettingRow>
            <SettingRow label="Hide in taskbar">
                <Switch
                    aria-label="Hide in taskbar"
                    checked={hideInTaskbar}
                    onChange={(event) => setHideInTaskbar(event.currentTarget.checked)}
                />
            </SettingRow>
            <SettingRow label="Always on top">
                <Switch
                    aria-label="Always on top"
                    checked={alwaysOnTop}
                    onChange={(event) => setAlwaysOnTop(event.currentTarget.checked)}
                />
            </SettingRow>
        </>
    );
}
