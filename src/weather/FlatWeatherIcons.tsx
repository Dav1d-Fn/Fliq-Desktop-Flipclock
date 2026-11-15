import type { ReactNode } from "react";
import {
    createReactComponent,
    IconCloud,
    IconCloudRain,
    IconCloudSnow,
    IconCloudStorm,
    IconMist,
    IconMoon,
    IconSnowflake,
    IconSun,
    IconSunrise,
    IconSunset,
    IconTemperature,
    type Icon,
} from "@tabler/icons-react";

// Tabler's cloud and moon outlines, reused smaller in the two combined icons below. Their stroke
// width is raised by the inverse of the scale, so they end up as thick as the other icons.
const CLOUD_PATH = "M6.657 18c-2.572 0 -4.657 -2.007 -4.657 -4.483c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 1.927 -1.551 3.487 -3.465 3.487h-11.878";
const MOON_PATH = "M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z";

// Partly cloudy by day: a small sun peeking out above a cloud.
const IconCloudSun = createReactComponent("outline", "cloud-sun", "IconCloudSun", [
    ["path", { d: "M5.4 9.5a3 3 0 1 1 5.55 -2.02", key: "sun" }],
    ["path", { d: "M8 2v1.5m-6 4.5h1.5m.3 -4.2l1 1m8.4 -1l-1 1m-8.4 7.4l1 -1", key: "rays" }],
    ["path", { d: CLOUD_PATH, transform: "translate(5 6) scale(0.8)", strokeWidth: "2.5", key: "cloud" }],
]);

// Partly cloudy at night: a small moon above a cloud.
const IconCloudMoon = createReactComponent("outline", "cloud-moon", "IconCloudMoon", [
    ["path", { d: MOON_PATH, transform: "translate(10 1) scale(0.55)", strokeWidth: "3.6", key: "moon" }],
    ["path", { d: CLOUD_PATH, transform: "translate(-1 6) scale(0.8)", strokeWidth: "2.5", key: "cloud" }],
]);

// Every emoji WeatherFormatter writes, with its flat line icon.
const FLAT_ICONS: Record<string, Icon> = {
    "☁️🌙": IconCloudMoon,
    "☀️": IconSun,
    "🌕": IconMoon,
    "🌤️": IconCloudSun,
    "☁️": IconCloud,
    "🌧️": IconCloudRain,
    "⛈️": IconCloudStorm,
    "❄️": IconSnowflake,
    "🌫️": IconMist,
    "🌨️": IconCloudSnow,
    "🌡️": IconTemperature,
    "🌅": IconSunrise,
    "🌇": IconSunset,
};

// Longest first, so "☁️🌙" wins over "☁️". The capture group keeps the emoji in split().
const EMOJI_PATTERN = new RegExp(
    `(${Object.keys(FLAT_ICONS).sort((first, second) => second.length - first.length).join("|")})`,
    "u",
);

// Weather text with its emoji swapped for monochrome line icons. They draw in currentColor,
// so they take the block's text color, and are 1em tall like the letters around them.
export function withFlatIcons(text: string): ReactNode[]
{
    return text.split(EMOJI_PATTERN).map((part, partIndex) =>
    {
        const FlatIcon = FLAT_ICONS[part];
        if (!FlatIcon)
        {
            return part;
        }
        return <FlatIcon key={partIndex} size="1em" aria-hidden style={{ verticalAlign: "-0.125em" }} />;
    });
}
