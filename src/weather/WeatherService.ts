import type { SunDay, SunDays, WeatherReport } from "./WeatherTypes.ts";
import { WeatherFormatter } from "./WeatherFormatter.ts";

// Talks to the two public APIs. Knows nothing about React or storage.
export class WeatherService
{
    // Current conditions from wttr.in. An empty location lets wttr.in pick one from the IP.
    static async fetchReport(location: string, language: string): Promise<WeatherReport>
    {
        const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1&lang=${language}`;
        const response = await fetch(url);
        if (!response.ok)
        {
            throw new Error(`wttr.in answered ${response.status}`);
        }

        const data = await response.json();
        const current = data.current_condition?.[0];
        const area = data.nearest_area?.[0];
        if (!current || !area)
        {
            throw new Error("wttr.in sent no current conditions");
        }

        const descriptionEnglish = current.weatherDesc?.[0]?.value ?? "";
        const descriptionLocalized = current[`lang_${language}`]?.[0]?.value ?? descriptionEnglish;

        return {
            temperatureCelsius: current.temp_C,
            temperatureFahrenheit: current.temp_F,
            feelsLikeCelsius: current.FeelsLikeC,
            feelsLikeFahrenheit: current.FeelsLikeF,
            descriptionEnglish,
            descriptionLocalized,
            latitude: area.latitude,
            longitude: area.longitude,
        };
    }

    // Sunrise and sunset for today and tomorrow. Tomorrow is needed after sunset, when the next
    // sun event is tomorrow's sunrise.
    static async fetchSunDays(latitude: string, longitude: string, now: Date): Promise<SunDays>
    {
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const days = await Promise.all([
            WeatherService.fetchSunDay(latitude, longitude, WeatherFormatter.localDate(now)),
            WeatherService.fetchSunDay(latitude, longitude, WeatherFormatter.localDate(tomorrow)),
        ]);
        return { latitude, longitude, days };
    }

    private static async fetchSunDay(latitude: string, longitude: string, date: string): Promise<SunDay>
    {
        const url = `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0&date=${date}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.status !== "OK")
        {
            throw new Error(`sunrise-sunset.org answered ${data.status}`);
        }

        return {
            date,
            sunrise: new Date(data.results.sunrise).getTime(),
            sunset: new Date(data.results.sunset).getTime(),
        };
    }
}
