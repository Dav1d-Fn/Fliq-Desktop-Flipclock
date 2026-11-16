import { useEffect, useState } from "react";
import { Text } from "@mantine/core";
import { useAtomValue } from "jotai";
import { useStrings } from "../../../../i18n/useStrings";
import { ATOMS } from "../../../../settings/atoms";
import { withFlatIcons } from "../../../../weather/FlatWeatherIcons";
import { WeatherFormatter } from "../../../../weather/WeatherFormatter";
import { WeatherService } from "../../../../weather/WeatherService";
import type { SunDays, WeatherReport } from "../../../../weather/WeatherTypes";

interface WeatherPreviewProps
{
    query: string;
}

interface PreviewState
{
    status: "loading" | "ready" | "failed";
    report?: WeatherReport;
    sunDays?: SunDays | null;
}

// Asks the weather service for the chosen location, the same way the clock does, and shows
// what came back: the place it resolved to and the current weather.
export function WeatherPreview({ query }: WeatherPreviewProps)
{
    const text = useStrings().weather;
    const language = useAtomValue(ATOMS.LANGUAGE);
    const unit = useAtomValue(ATOMS.WEATHER_UNIT);
    const [state, setState] = useState<PreviewState>({ status: "loading" });

    useEffect(() =>
    {
        let cancelled = false;
        setState({ status: "loading" });

        async function load()
        {
            try
            {
                const report = await WeatherService.fetchReport(query, language);
                // Sun times are a bonus; the place and weather are what's checked here.
                const sunDays = await WeatherService.fetchSunDays(report.latitude, report.longitude, new Date())
                    .catch(() => null);
                if (!cancelled)
                {
                    setState({ status: "ready", report, sunDays });
                }
            }
            catch (error)
            {
                console.error("Weather preview failed:", error);
                if (!cancelled)
                {
                    setState({ status: "failed" });
                }
            }
        }

        load();
        return () =>
        {
            cancelled = true;
        };
    }, [query, language]);

    if (state.status === "loading" || !state.report)
    {
        return state.status === "failed"
            ? <Text size="sm" c="red" maw={280}>{text.previewFailed}</Text>
            : <Text size="sm" c="dimmed">{text.previewLoading}</Text>;
    }

    const report = state.report;
    const formatter = new WeatherFormatter(report, state.sunDays ?? null, unit, new Date());
    const place = [report.areaName, report.region, report.country]
        .filter((part) => Boolean(part))
        .join(", ");

    return (
        <div>
            <Text size="sm" fw={600}>
                {place}
                {query === "" && <Text span size="sm" c="dimmed"> ({text.previewAutomatic})</Text>}
            </Text>
            <Text size="sm">{withFlatIcons(`${formatter.format("descemoji")} · ${formatter.format("temp")}`)}</Text>
            {state.sunDays && (
                <Text size="sm" c="dimmed">
                    {withFlatIcons(`${formatter.format("sunrise")}   ${formatter.format("sunset")}`)}
                </Text>
            )}
        </div>
    );
}
