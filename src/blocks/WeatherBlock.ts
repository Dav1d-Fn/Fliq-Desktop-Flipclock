import type { BlockDefinition } from "./BlockDefinition.ts";

// Display option -> WeatherFormatter key without and with the weather emoji.
const WEATHER_KEYS: Record<string, [string, string]> = {
    temp: ["temp", "tempEmoji"],
    cond: ["full", "fullEmoji"],
    feels: ["feelsLike", "feelsLikeEmoji"],
    hilo: ["highLow", "highLowEmoji"],
    sun: ["nextsun_noemoji", "nextsun"],
};

// Location and unit are set once under Data > Weather, not per block.
export const WEATHER_BLOCK: BlockDefinition = {
    kind: "weather",
    name: "Weather",
    defaultSize: { w: 2, h: 1 },
    defaults: { display: "temp", weatherIcon: true },
    displayOptions: [
        { id: "temp", label: "Temperature" },
        { id: "cond", label: "With condition" },
        { id: "feels", label: "Feels like" },
        { id: "hilo", label: "High & low" },
        { id: "sun", label: "Next sunrise / sunset" },
    ],
    supportsCustomFormat: false,
    alignable: true,
    segments: (block) =>
    {
        const [plainKey, emojiKey] = WEATHER_KEYS[block.display] ?? WEATHER_KEYS.temp;
        return [{ type: "WEATHER", value: block.weatherIcon === false ? plainKey : emojiKey }];
    },
};
