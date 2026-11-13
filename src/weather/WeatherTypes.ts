// Shapes of the weather data kept in localStorage (see ATOMS.WEATHER_REPORT / ATOMS.SUN_DAYS).
//
// Raw values only, nothing pre-formatted: the unit, the emoji and the next sun event are worked
// out while rendering. That way switching °C/°F needs no new request, and day/night follows the
// clock instead of the moment of the last download.

export interface WeatherReport
{
    temperatureCelsius: string;
    temperatureFahrenheit: string;
    feelsLikeCelsius: string;
    feelsLikeFahrenheit: string;
    // Today's high and low. Missing in caches written before they were fetched.
    highCelsius?: string;
    highFahrenheit?: string;
    lowCelsius?: string;
    lowFahrenheit?: string;
    descriptionEnglish: string;
    descriptionLocalized: string;
    latitude: string;
    longitude: string;
}

// Sunrise and sunset of one calendar day, as epoch milliseconds. Numbers instead of Date objects
// because they survive the JSON round trip through localStorage unchanged.
export interface SunDay
{
    date: string; // local calendar date, YYYY-MM-DD
    sunrise: number;
    sunset: number;
}

export interface SunDays
{
    latitude: string;
    longitude: string;
    days: SunDay[];
}
