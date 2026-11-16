import type { SunDay, SunDays, WeatherReport } from "./WeatherTypes.ts";
import { WeatherFormatter } from "./WeatherFormatter.ts";
import { WeatherPlaces, type GeocodingResult, type WeatherPlace } from "./WeatherPlace.ts";

// Talks to the two public APIs. Knows nothing about React or storage.
export class WeatherService
{
    // Places matching a typed name, from the Open-Meteo geocoding API, labelled in `language`.
    // Asked in English too, so German and English names both work (Köln and Cologne).
    static async searchPlaces(name: string, language: string, signal?: AbortSignal): Promise<WeatherPlace[]>
    {
        const languages = [...new Set([language, "en"])];
        const resultLists = await Promise.all(languages.map((searchLanguage) =>
            WeatherService.searchPlacesIn(name, searchLanguage, signal)));
        return WeatherPlaces.merged(resultLists);
    }

    private static async searchPlacesIn(name: string, language: string, signal?: AbortSignal): Promise<GeocodingResult[]>
    {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=8&language=${language}&format=json`;
        const response = await fetch(url, { signal });
        if (!response.ok)
        {
            throw new Error(`Open-Meteo answered ${response.status}`);
        }

        const data = await response.json();
        return data.results ?? [];
    }

    // Current conditions from wttr.in. `location` is a name or "lat,lon"; empty lets wttr.in
    // pick one from the IP.
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
        const today = data.weather?.[0];
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
            highCelsius: today?.maxtempC,
            highFahrenheit: today?.maxtempF,
            lowCelsius: today?.mintempC,
            lowFahrenheit: today?.mintempF,
            descriptionEnglish,
            descriptionLocalized,
            areaName: area.areaName?.[0]?.value,
            region: area.region?.[0]?.value,
            country: area.country?.[0]?.value,
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
