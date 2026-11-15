// A place picked from the city search. Stored next to the location text (ATOMS.WEATHER_PLACE),
// so the weather is asked for by coordinates and same-named towns can't be mixed up.
export interface WeatherPlace
{
    label: string; // "Köln, Nordrhein-Westfalen, Deutschland", also the text in the city field
    latitude: number;
    longitude: number;
}

// One result of the Open-Meteo geocoding API, only the fields used here.
export interface GeocodingResult
{
    id: number;
    name: string;
    population?: number;
    admin1?: string;
    country?: string;
    latitude: number;
    longitude: number;
}

export class WeatherPlaces
{
    static fromGeocoding(result: GeocodingResult): WeatherPlace
    {
        const parts = [result.name, result.admin1, result.country]
            .filter((part): part is string => Boolean(part));
        // Drop a region that only repeats the name (Berlin, Berlin, Deutschland).
        const unique = parts.filter((part, partIndex) => parts.indexOf(part) === partIndex);
        return {
            label: unique.join(", "),
            latitude: result.latitude,
            longitude: result.longitude,
        };
    }

    // Joins the answers of several searches (one per language: the API only matches names in the
    // language asked for, so "Cologne" finds Köln in English only). The first list wins for a
    // place found twice, so its label stays in the UI language. Biggest places first.
    static merged(resultLists: GeocodingResult[][]): WeatherPlace[]
    {
        const byId = new Map<number, GeocodingResult>();
        for (const result of resultLists.flat())
        {
            if (!byId.has(result.id))
            {
                byId.set(result.id, result);
            }
        }
        return [...byId.values()]
            .sort((first, second) => (second.population ?? 0) - (first.population ?? 0))
            .map((result) => WeatherPlaces.fromGeocoding(result));
    }

    // What wttr.in is asked for. The picked place wins while the city field still shows its
    // label. Anything else is free text: locations saved before the search existed, text typed
    // without picking a suggestion, or a value set through tuxhub. Empty means "by IP".
    static query(location: string, place: WeatherPlace | null): string
    {
        if (place && place.label === location)
        {
            return `${place.latitude.toFixed(4)},${place.longitude.toFixed(4)}`;
        }
        return location.trim();
    }
}
