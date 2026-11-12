import type { SunDay, SunDays, WeatherReport } from "./WeatherTypes.ts";

interface SunEvent
{
    time: number;
    emoji: string;
}

// Turns the stored raw data into the text of one $WEATHER(key) placeholder. Pure: everything it
// depends on, the current time included, comes in as an argument.
export class WeatherFormatter
{
    private readonly report: WeatherReport | null;
    private readonly sunDays: SunDays | null;
    private readonly unit: string;
    private readonly now: Date;

    constructor(report: WeatherReport | null, sunDays: SunDays | null, unit: string, now: Date)
    {
        this.report = report;
        this.sunDays = sunDays;
        this.unit = unit;
        this.now = now;
    }

    format(key: string): string
    {
        const report = this.report;
        if (!report)
        {
            return "Loading weather…";
        }

        const emoji = this.weatherEmoji(report.descriptionEnglish);
        const temperature = this.temperature(report.temperatureCelsius, report.temperatureFahrenheit);
        const feelsLike = this.temperature(report.feelsLikeCelsius, report.feelsLikeFahrenheit);
        const description = report.descriptionLocalized;
        const today = this.today();
        const nextSun = this.nextSunEvent();

        switch (key.toLowerCase())
        {
            case "emoji":
                return emoji;
            case "temp":
                return temperature;
            case "tempemoji":
                return `${emoji} ${temperature}`;
            case "feelslike":
                return feelsLike;
            case "feelslikeemoji":
                return `${emoji} ${feelsLike}`;
            case "desc":
                return description;
            case "descemoji":
                return `${emoji} ${description}`;
            case "full":
                return `${temperature} – ${description}`;
            case "sunrise":
                return today ? `🌅 ${WeatherFormatter.clockTime(today.sunrise)}` : "–";
            case "sunrise_noemoji":
                return today ? WeatherFormatter.clockTime(today.sunrise) : "–";
            case "sunset":
                return today ? `🌇 ${WeatherFormatter.clockTime(today.sunset)}` : "–";
            case "sunset_noemoji":
                return today ? WeatherFormatter.clockTime(today.sunset) : "–";
            case "nextsun":
                return nextSun ? `${nextSun.emoji} ${WeatherFormatter.clockTime(nextSun.time)}` : "–";
            case "nextsun_noemoji":
                return nextSun ? WeatherFormatter.clockTime(nextSun.time) : "–";
            default:
                // "fullemoji", "default" and anything unknown
                return `${emoji} ${temperature} – ${description}`;
        }
    }

    private temperature(celsius: string, fahrenheit: string): string
    {
        const value = this.unit === "C" ? celsius : fahrenheit;
        return `${value} °${this.unit}`;
    }

    private today(): SunDay | undefined
    {
        const days = this.sunDays?.days ?? [];
        const todayDate = WeatherFormatter.localDate(this.now);
        return days.find((day) => day.date === todayDate) ?? days[0];
    }

    private nextSunEvent(): SunEvent | null
    {
        const days = this.sunDays?.days ?? [];
        const now = this.now.getTime();
        for (const day of days)
        {
            if (now < day.sunrise)
            {
                return { time: day.sunrise, emoji: "🌅" };
            }
            if (now < day.sunset)
            {
                return { time: day.sunset, emoji: "🌇" };
            }
        }
        // Data is outdated (all events passed): show the last known sunrise rather than nothing.
        const last = days[days.length - 1];
        return last ? { time: last.sunrise, emoji: "🌅" } : null;
    }

    private isDaytime(): boolean
    {
        const today = this.today();
        const now = this.now.getTime();
        if (today)
        {
            return now >= today.sunrise && now < today.sunset;
        }
        // No sun times known: roughly 6 to 21 o'clock.
        const hour = this.now.getHours();
        return hour >= 6 && hour < 21;
    }

    private weatherEmoji(descriptionEnglish: string): string
    {
        const description = descriptionEnglish.toLowerCase();
        const isDay = this.isDaytime();

        if (description.includes("sun") || description.includes("clear"))
        {
            return isDay ? "☀️" : "🌕";
        }
        if (description.includes("partly cloudy"))
        {
            return isDay ? "🌤️" : "☁️🌙";
        }
        if (description.includes("cloud") || description.includes("overcast"))
        {
            return "☁️";
        }
        if (description.includes("rain") || description.includes("drizzle"))
        {
            return "🌧️";
        }
        if (description.includes("thunder") || description.includes("storm"))
        {
            return "⛈️";
        }
        if (description.includes("snow") || description.includes("blizzard"))
        {
            return "❄️";
        }
        if (description.includes("fog") || description.includes("mist"))
        {
            return "🌫️";
        }
        if (description.includes("hail"))
        {
            return "🌨️";
        }
        return "🌡️";
    }

    // YYYY-MM-DD in local time, the same form WeatherService stores.
    static localDate(date: Date): string
    {
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${date.getFullYear()}-${month}-${day}`;
    }

    private static clockTime(epochMilliseconds: number): string
    {
        return new Date(epochMilliseconds).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
}
