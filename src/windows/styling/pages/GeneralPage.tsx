import { Button, Select } from "@mantine/core";
import { useAtom, useSetAtom } from "jotai";
import { useStrings } from "../../../i18n/useStrings";
import { ATOMS } from "../../../settings/atoms";
import { UI_LANGUAGE_OPTIONS, type UiLanguage } from "../../../settings/options";
import { SettingsReset } from "../../../settings/SettingsReset";
import { SettingRow } from "../controls/SettingRow";
import { SettingsCard } from "../controls/SettingsCard";
import { PageHeader } from "../layout/PageHeader";
import { OverlayModeRow } from "./OverlayModeRow";

async function resetAllSettings(confirmText: string)
{
    if (!window.confirm(confirmText))
    {
        return;
    }
    await SettingsReset.resetAll();
    // The overlay mode select keeps its own copy of the Rust-side value; a reload drops it.
    window.location.reload();
}

export function GeneralPage()
{
    const strings = useStrings();
    const [uiLanguage, setUiLanguage] = useAtom(ATOMS.UI_LANGUAGE);
    const setDateLanguage = useSetAtom(ATOMS.LANGUAGE);

    // The clock's dates follow the new language; another date language can still be picked
    // under Data › Time afterwards.
    function changeLanguage(value: string | null)
    {
        if (!value)
        {
            return;
        }
        setUiLanguage(value as UiLanguage);
        setDateLanguage(value);
    }

    return (
        <>
            <PageHeader title={strings.general.title} intro={strings.general.intro} />

            <SettingsCard title={strings.general.languageCard}>
                <SettingRow label={strings.general.languageLabel} description={strings.general.languageDescription}>
                    <Select
                        aria-label={strings.general.languageLabel}
                        value={uiLanguage}
                        onChange={changeLanguage}
                        data={UI_LANGUAGE_OPTIONS}
                        allowDeselect={false}
                        w={200}
                    />
                </SettingRow>
            </SettingsCard>

            <SettingsCard title={strings.general.windowCard}>
                <SettingRow
                    label={strings.general.windowLabel}
                    description={strings.general.windowDescription}
                >
                    <span />
                </SettingRow>
                <OverlayModeRow />
            </SettingsCard>

            <SettingsCard title={strings.general.resetCard}>
                <SettingRow label={strings.general.resetLabel} description={strings.general.resetDescription}>
                    <Button variant="default" color="red" c="red.8" onClick={() => void resetAllSettings(strings.general.resetConfirm)}>
                        {strings.general.resetButton}
                    </Button>
                </SettingRow>
            </SettingsCard>
        </>
    );
}
