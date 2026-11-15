import { Button } from "@mantine/core";
import { useSettingsHost } from "../host/SettingsHost";
import { SettingRow } from "../controls/SettingRow";
import { SettingsCard } from "../controls/SettingsCard";
import { PageHeader } from "../layout/PageHeader";
import { OverlayModeRow } from "./OverlayModeRow";
import { WindowToggles } from "./WindowToggles";

export function GeneralPage()
{
    const host = useSettingsHost();

    function resetAllSettings()
    {
        if (!window.confirm("Reset all settings to their defaults? This can't be undone."))
        {
            return;
        }
        host.resetAllSettings().catch((error) => console.error("Resetting the settings failed:", error));
    }

    return (
        <>
            <PageHeader title="General" intro="How the window behaves." />

            <SettingsCard title="Window">
                {host.embedded
                    ? <WindowToggles />
                    : (
                        <SettingRow
                            label="Autostart, taskbar, always on top"
                            description="Right-click the clock to switch these."
                        >
                            <span />
                        </SettingRow>
                    )}
                <OverlayModeRow />
            </SettingsCard>

            <SettingsCard title="Reset">
                <SettingRow label="Reset all settings" description="Restores every option to its default. Can't be undone.">
                    <Button variant="default" color="red" c="var(--fliq-danger)" onClick={resetAllSettings}>
                        Reset…
                    </Button>
                </SettingRow>
            </SettingsCard>
        </>
    );
}
