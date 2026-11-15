import { useCallback, useState } from "react";
import { SegmentedControl } from "@mantine/core";
import { useAtom } from "jotai";
import { useStrings } from "../../../i18n/useStrings";
import { ATOMS } from "../../../settings/atoms";
import { WeatherPlaces, type WeatherPlace } from "../../../weather/WeatherPlace";
import { SavedToast } from "../controls/SavedToast";
import { SettingRow } from "../controls/SettingRow";
import { SettingsCard } from "../controls/SettingsCard";
import { PageHeader } from "../layout/PageHeader";
import { PlaceSearch } from "./weather/PlaceSearch";
import { WeatherPreview } from "./weather/WeatherPreview";

export function WeatherPage()
{
    const [location, setLocation] = useAtom(ATOMS.WEATHER_LOCATION);
    const [place, setPlace] = useAtom(ATOMS.WEATHER_PLACE);
    const [unit, setUnit] = useAtom(ATOMS.WEATHER_UNIT);
    const [savedMessage, setSavedMessage] = useState<{ text: string } | null>(null);
    const hideSavedMessage = useCallback(() => setSavedMessage(null), []);
    const text = useStrings().weather;
    const unitSegments = [
        { value: "C", label: text.celsius },
        { value: "F", label: text.fahrenheit },
    ];

    function pickPlace(picked: WeatherPlace)
    {
        setPlace(picked);
        setLocation(picked.label);
        setSavedMessage({ text: text.saved(picked.label) });
    }

    function saveFreeText(typed: string)
    {
        const trimmed = typed.trim();
        setPlace(null);
        setLocation(trimmed);
        setSavedMessage({ text: trimmed === "" ? text.savedAutomatic : text.saved(trimmed) });
    }

    return (
        <>
            <PageHeader title={text.title} intro={text.intro} />

            <SettingsCard title={text.locationCard}>
                <SettingRow label={text.cityLabel} description={text.cityDescription}>
                    <PlaceSearch location={location} onPick={pickPlace} onFreeText={saveFreeText} />
                </SettingRow>
                <SettingRow label={text.previewLabel} description={text.previewDescription}>
                    <WeatherPreview query={WeatherPlaces.query(location, place)} />
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

            <SavedToast message={savedMessage} onClose={hideSavedMessage} />
        </>
    );
}
