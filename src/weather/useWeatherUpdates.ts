import { useEffect } from "react";
import { useAtomValue, useStore } from "jotai";
import { ATOMS } from "../settings/atoms";
import { WeatherService } from "./WeatherService";
import { WeatherFormatter } from "./WeatherFormatter";

// wttr.in itself updates roughly every 15-30 minutes; asking more often only adds requests.
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

// Keeps ATOMS.WEATHER_REPORT and ATOMS.SUN_DAYS up to date. Runs in the clock window only; the
// ghost windows and the styling menu read the result through the shared storage.
export function useWeatherUpdates(): void
{
    const location = useAtomValue(ATOMS.WEATHER_LOCATION);
    const language = useAtomValue(ATOMS.LANGUAGE);
    const store = useStore();

    useEffect(() =>
    {
        // Keys of the old pre-formatted weather cache, no longer read by anything.
        localStorage.removeItem("weatherData");
        localStorage.removeItem("sunTimes");
    }, []);

    useEffect(() =>
    {
        let cancelled = false;

        async function refresh()
        {
            try
            {
                const report = await WeatherService.fetchReport(location, language);
                if (cancelled)
                {
                    return;
                }
                // Only write on a real change: every write reaches the other windows as a
                // storage event.
                if (JSON.stringify(store.get(ATOMS.WEATHER_REPORT)) !== JSON.stringify(report))
                {
                    store.set(ATOMS.WEATHER_REPORT, report);
                }

                const now = new Date();
                const known = store.get(ATOMS.SUN_DAYS);
                const sunDaysAreCurrent = known !== null
                    && known.latitude === report.latitude
                    && known.longitude === report.longitude
                    && known.days[0]?.date === WeatherFormatter.localDate(now);
                if (!sunDaysAreCurrent)
                {
                    const sunDays = await WeatherService.fetchSunDays(report.latitude, report.longitude, now);
                    if (!cancelled)
                    {
                        store.set(ATOMS.SUN_DAYS, sunDays);
                    }
                }
            }
            catch (error)
            {
                console.error("Could not load the weather:", error);
            }
        }

        refresh();
        const intervalId = setInterval(refresh, REFRESH_INTERVAL_MS);
        return () =>
        {
            cancelled = true;
            clearInterval(intervalId);
        };
    }, [location, language, store]);
}
