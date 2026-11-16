import { Switch } from "@mantine/core";
import { useStrings } from "../../../../i18n/useStrings";
import type { BlockSettingsProps } from "../BlockEditors";

export function WeatherSettings({ block, onChange }: BlockSettingsProps)
{
    const text = useStrings().blockInspector;

    return (
        <>
            <Switch
                mt={16}
                label={text.showWeatherIcon}
                checked={block.weatherIcon !== false}
                onChange={(event) => onChange({ weatherIcon: event.currentTarget.checked })}
            />
            <p className="inspector-note">{text.weatherNote}</p>
        </>
    );
}
