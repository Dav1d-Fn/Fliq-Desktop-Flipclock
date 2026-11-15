import { SegmentedControl, Select, Switch } from "@mantine/core";
import { useAtom } from "jotai";
import type { HourCycle } from "../../../blocks/BlockDefinition";
import { useStrings } from "../../../i18n/useStrings";
import { ATOMS } from "../../../settings/atoms";
import { LOCALE_OPTIONS } from "../../../settings/options";
import { SettingRow } from "../controls/SettingRow";
import { SettingsCard } from "../controls/SettingsCard";
import { PageHeader } from "../layout/PageHeader";

const LANGUAGE_DATA = LOCALE_OPTIONS.map((locale) => ({ value: locale.code, label: locale.name }));

export function TimePage()
{
    const [language, setLanguage] = useAtom(ATOMS.LANGUAGE);
    const [hourCycle, setHourCycle] = useAtom(ATOMS.HOUR_CYCLE);
    const [leadingZero, setLeadingZero] = useAtom(ATOMS.HOUR_LEADING_ZERO);
    const strings = useStrings();
    const text = strings.time;
    const hourCycleSegments = [
        { value: "24", label: text.hour24 },
        { value: "12", label: text.hour12 },
    ];

    return (
        <>
            <PageHeader title={text.title} intro={text.intro} />

            <SettingsCard title={text.clockCard}>
                <SettingRow label={text.formatLabel} description={text.formatDescription}>
                    <SegmentedControl
                        aria-label={text.formatLabel}
                        value={hourCycle}
                        onChange={(value) => setHourCycle(value as HourCycle)}
                        data={hourCycleSegments}
                    />
                </SettingRow>
                <SettingRow label={text.leadingZeroLabel} description={text.leadingZeroDescription}>
                    <Switch
                        aria-label={text.leadingZeroLabel}
                        checked={leadingZero}
                        onChange={(event) => setLeadingZero(event.currentTarget.checked)}
                    />
                </SettingRow>
            </SettingsCard>

            <SettingsCard title={text.languageCard}>
                <SettingRow label={text.dateLanguageLabel} description={text.dateLanguageDescription}>
                    <Select
                        aria-label={text.dateLanguageLabel}
                        value={language}
                        onChange={(value) => value && setLanguage(value)}
                        data={LANGUAGE_DATA}
                        allowDeselect={false}
                        w={200}
                    />
                </SettingRow>
            </SettingsCard>
        </>
    );
}
