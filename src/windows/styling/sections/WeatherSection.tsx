import { Group, Select } from "@mantine/core";
import { useAtom } from "jotai";
import { ATOMS } from "../../../settings/atoms";
import { TEMPERATURE_UNIT_OPTIONS } from "../../../settings/options";
import { DraftTextInput } from "../controls/DraftTextInput";
import { SettingsCard } from "../controls/SettingsCard";

export function WeatherSection()
{
    const [unit, setUnit] = useAtom(ATOMS.WEATHER_UNIT);
    const [location, setLocation] = useAtom(ATOMS.WEATHER_LOCATION);

    return (
        <SettingsCard title="$WEATHER Settings">
            <Group grow>
                <Select
                    label="Weather Unit"
                    value={unit}
                    onChange={(value) => value && setUnit(value)}
                    data={TEMPERATURE_UNIT_OPTIONS}
                    labelProps={{ style: { marginBottom: 12 } }}
                />
                <DraftTextInput
                    label="Location"
                    placeholder="Leave empty for automatic detection."
                    value={location}
                    onCommit={setLocation}
                />
            </Group>
        </SettingsCard>
    );
}
