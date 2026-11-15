import { SegmentedControl } from "@mantine/core";
import { useAtom } from "jotai";
import { useStrings } from "../../../i18n/useStrings";
import { ATOMS } from "../../../settings/atoms";
import { DraftTextInput } from "../controls/DraftTextInput";
import { SettingRow } from "../controls/SettingRow";
import { SettingsCard } from "../controls/SettingsCard";
import { PageHeader } from "../layout/PageHeader";

export function WeatherPage()
{
    const [location, setLocation] = useAtom(ATOMS.WEATHER_LOCATION);
    const [unit, setUnit] = useAtom(ATOMS.WEATHER_UNIT);
    const text = useStrings().weather;
    const unitSegments = [
        { value: "C", label: text.celsius },
        { value: "F", label: text.fahrenheit },
    ];

    return (
        <>
            <PageHeader title={text.title} intro={text.intro} />

            <SettingsCard title={text.locationCard}>
                <SettingRow label={text.cityLabel} description={text.cityDescription}>
                    <DraftTextInput
                        ariaLabel={text.cityLabel}
                        placeholder={text.cityPlaceholder}
                        value={location}
                        onCommit={setLocation}
                        width={220}
                    />
                </SettingRow>
            </SettingsCard>

            <SettingsCard title={text.unitsCard}>
                <SettingRow label={text.temperatureLabel}>
                    <SegmentedControl
                        aria-label={text.temperatureAria}
                        value={unit}
                        onChange={setUnit}
                        data={unitSegments}
                    />
                </SettingRow>
            </SettingsCard>
        </>
    );
}
