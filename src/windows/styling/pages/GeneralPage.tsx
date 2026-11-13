import { Button } from "@mantine/core";
import { SettingsReset } from "../../../settings/SettingsReset";
import { SettingRow } from "../controls/SettingRow";
import { SettingsCard } from "../controls/SettingsCard";
import { PageHeader } from "../layout/PageHeader";
import { OverlayModeRow } from "./OverlayModeRow";

async function resetAllSettings()
{
    if (!window.confirm("Reset all settings to their defaults? This can't be undone."))
    {
        return;
    }
    await SettingsReset.resetAll();
    // The overlay mode select keeps its own copy of the Rust-side value; a reload drops it.
    window.location.reload();
}

export function GeneralPage()
{
    return (
        <>
            <PageHeader title="General" intro="How the window behaves." />

            <SettingsCard title="Window">
                <SettingRow
                    label="Autostart, taskbar, always on top"
                    description="Right-click the clock to switch these."
                >
                    <span />
                </SettingRow>
                <OverlayModeRow />
            </SettingsCard>

            <SettingsCard title="Reset">
                <SettingRow label="Reset all settings" description="Restores every option to its default. Can't be undone.">
                    <Button variant="default" color="red" c="red.8" onClick={resetAllSettings}>
                        Reset…
                    </Button>
                </SettingRow>
            </SettingsCard>
        </>
    );
}
