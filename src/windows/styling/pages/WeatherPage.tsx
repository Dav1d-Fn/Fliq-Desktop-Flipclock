import { SegmentedControl } from "@mantine/core";
import { useAtom } from "jotai";
import { ATOMS } from "../../../settings/atoms";
import { DraftTextInput } from "../controls/DraftTextInput";
import { SettingRow } from "../controls/SettingRow";
import { SettingsCard } from "../controls/SettingsCard";
import { PageHeader } from "../layout/PageHeader";

const UNIT_SEGMENTS = [
    { value: "C", label: "Celsius" },
    { value: "F", label: "Fahrenheit" },
];

export function WeatherPage()
{
    const [location, setLocation] = useAtom(ATOMS.WEATHER_LOCATION);
    const [unit, setUnit] = useAtom(ATOMS.WEATHER_UNIT);

    return (
        <>
            <PageHeader title="Weather" intro="Where and in which unit every weather block reports." />

            <SettingsCard title="Location">
                <SettingRow label="City" description="Leave empty to detect your location automatically.">
                    <DraftTextInput
                        ariaLabel="City"
                        placeholder="Automatic"
                        value={location}
                        onCommit={setLocation}
                        width={220}
                    />
                </SettingRow>
            </SettingsCard>

            <SettingsCard title="Units">
                <SettingRow label="Temperature">
                    <SegmentedControl
                        aria-label="Temperature unit"
                        value={unit}
                        onChange={setUnit}
                        data={UNIT_SEGMENTS}
                    />
                </SettingRow>
            </SettingsCard>
        </>
    );
}
