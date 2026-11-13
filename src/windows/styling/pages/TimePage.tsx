import { SegmentedControl, Select, Switch } from "@mantine/core";
import { useAtom } from "jotai";
import type { HourCycle } from "../../../blocks/BlockDefinition";
import { ATOMS } from "../../../settings/atoms";
import { LOCALE_OPTIONS } from "../../../settings/options";
import { SettingRow } from "../controls/SettingRow";
import { SettingsCard } from "../controls/SettingsCard";
import { PageHeader } from "../layout/PageHeader";

const LANGUAGE_DATA = LOCALE_OPTIONS.map((locale) => ({ value: locale.code, label: locale.name }));

const HOUR_CYCLE_SEGMENTS = [
    { value: "24", label: "24-hour" },
    { value: "12", label: "12-hour" },
];

export function TimePage()
{
    const [language, setLanguage] = useAtom(ATOMS.LANGUAGE);
    const [hourCycle, setHourCycle] = useAtom(ATOMS.HOUR_CYCLE);
    const [leadingZero, setLeadingZero] = useAtom(ATOMS.HOUR_LEADING_ZERO);

    return (
        <>
            <PageHeader title="Time" intro="How every time and date block shows the time. A custom format is shown exactly as typed." />

            <SettingsCard title="Clock">
                <SettingRow label="Clock format" description="Flip time and time blocks. Time blocks add AM/PM in 12-hour mode.">
                    <SegmentedControl
                        aria-label="Clock format"
                        value={hourCycle}
                        onChange={(value) => setHourCycle(value as HourCycle)}
                        data={HOUR_CYCLE_SEGMENTS}
                    />
                </SettingRow>
                <SettingRow label="Leading zero for hours" description="09:30 instead of 9:30.">
                    <Switch
                        aria-label="Leading zero for hours"
                        checked={leadingZero}
                        onChange={(event) => setLeadingZero(event.currentTarget.checked)}
                    />
                </SettingRow>
            </SettingsCard>

            <SettingsCard title="Language">
                <SettingRow label="Date language" description="Names of weekdays and months in time and date blocks.">
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
        </>
    );
}
