import { Button, Select } from "@mantine/core";
import { useAtom } from "jotai";
import { ATOMS } from "../../../settings/atoms";
import { LOCALE_OPTIONS } from "../../../settings/options";
import { SettingsReset } from "../../../settings/SettingsReset";
import { SettingRow } from "../controls/SettingRow";
import { SettingsCard } from "../controls/SettingsCard";
import { PageHeader } from "../layout/PageHeader";
import { OverlayModeRow } from "./OverlayModeRow";

const LANGUAGE_DATA = LOCALE_OPTIONS.map((locale) => ({ value: locale.code, label: locale.name }));

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
    const [language, setLanguage] = useAtom(ATOMS.LANGUAGE);

    return (
        <>
            <PageHeader title="General" intro="Language and how the window behaves." />

            <SettingsCard title="Language">
                <SettingRow label="Date language" description="Names of weekdays and months in $TIME and $FLIPTIME.">
                    <Select
                        aria-label="Date language"
                        value={language}
                        onChange={(value) => value && setLanguage(value)}
                        data={LANGUAGE_DATA}
                        allowDeselect={false}
                        w={200}
                    />
                </SettingRow>
            </SettingsCard>

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
