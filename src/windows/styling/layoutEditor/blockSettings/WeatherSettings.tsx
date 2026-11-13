import { Switch } from "@mantine/core";
import type { BlockSettingsProps } from "../BlockEditors";

export function WeatherSettings({ block, onChange }: BlockSettingsProps)
{
    return (
        <>
            <Switch
                mt={16}
                label="Show weather icon"
                checked={block.weatherIcon !== false}
                onChange={(event) => onChange({ weatherIcon: event.currentTarget.checked })}
            />
            <p className="inspector-note">Location and units are set once under Data › Weather.</p>
        </>
    );
}
