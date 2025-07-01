// src/locales.ts
export const LOCALE_OPTIONS: { code: string; name: string }[] = [
  { code: "en", name: "English" },
  { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español" },
  { code: "it", name: "Italiano" },
  { code: "ru", name: "Русский" },
  { code: "zh", name: "中文" },
  { code: "ja", name: "日本語" },
  { code: "sv", name: "Svenska" },
  { code: "pl", name: "Polski" },
];

export const TEMPERATURE_UNIT_OPTIONS: { value: string; label: string }[] = [
  { value: 'C', label: 'Celsius (°C)' },
  { value: 'F', label: 'Fahrenheit (°F)' },
];

export const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: '"Courier New", monospace', label: 'Courier New' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Times New Roman", serif', label: 'Times New Roman' },
  { value: 'Tahoma, sans-serif', label: 'Tahoma' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: '"Trebuchet MS", sans-serif', label: 'Trebuchet MS' },
  { value: 'Impact, sans-serif', label: 'Impact' },
  { value: '"Lucida Console", monospace', label: 'Lucida Console' },
  { value: '"Segoe UI", sans-serif', label: 'Segoe UI' },
];

// Date format configuration for documentation hover card
export const DATETIME_FORMATS: {format: string; output: string; description: string; }[] = [
  { format: 'YY', output: '18', description: 'Two-digit year' },
  { format: 'YYYY', output: '2018', description: 'Four-digit year' },
  { format: 'M', output: '1-12', description: 'The month, beginning at 1' },
  { format: 'MM', output: '01-12', description: 'The month, 2-digits' },
  { format: 'MMM', output: 'Jan-Dec', description: 'The abbreviated month name' },
  { format: 'MMMM', output: 'January-December', description: 'The full month name' },
  { format: 'D', output: '1-31', description: 'The day of the month' },
  { format: 'DD', output: '01-31', description: 'The day of the month, 2-digits' },
  { format: 'd', output: '0-6', description: 'The day of the week, with Sunday as 0' },
  { format: 'dd', output: 'Su-Sa', description: 'The min name of the day of the week' },
  { format: 'ddd', output: 'Sun-Sat', description: 'The short name of the day of the week' },
  { format: 'dddd', output: 'Sunday-Saturday', description: 'The name of the day of the week' },
  { format: 'H', output: '0-23', description: 'The hour' },
  { format: 'HH', output: '00-23', description: 'The hour, 2-digits' },
  { format: 'h', output: '1-12', description: 'The hour, 12-hour clock' },
  { format: 'hh', output: '01-12', description: 'The hour, 12-hour clock, 2-digits' },
  { format: 'm', output: '0-59', description: 'The minute' },
  { format: 'mm', output: '00-59', description: 'The minute, 2-digits' },
  { format: 's', output: '0-59', description: 'The second' },
  { format: 'ss', output: '00-59', description: 'The second, 2-digits' },
  { format: 'SSS', output: '000-999', description: 'The millisecond, 3-digits' },
  { format: 'A', output: 'AM PM', description: 'The AM/PM designation' },
  { format: 'a', output: 'am pm', description: 'The lowercase AM/PM designation' },
];

export const WEATHER_FORMATS: { key: string; example: string; description: string }[] = [
  { key: 'emoji', example: '🌤️', description: 'Weather icon only (e.g., sunny, cloudy)' },
  { key: 'temp', example: '22°C', description: 'Current temperature only' },
  { key: 'tempEmoji', example: '🌤️ 22°C', description: 'Weather icon and temperature' },
  { key: 'feelsLike', example: '25°C', description: '"Feels like" temperature only' },
  { key: 'feelsLikeEmoji', example: '🌤️ 25°C', description: 'Weather icon and "feels like" temperature' },
  { key: 'desc', example: 'Partly cloudy', description: 'Short weather description' },
  { key: 'descEmoji', example: '🌤️ Partly cloudy', description: 'Weather icon and description' },
  { key: 'full', example: '22°C – Partly cloudy', description: 'Temperature and description' },
  { key: 'fullEmoji', example: '🌤️ 22°C – Partly cloudy', description: 'Icon, temperature, and description (full info)' },
  { key: 'default', example: '🌤️ 22°C – Partly cloudy', description: 'Default format (same as fullEmoji)' },

  // Sunrise / Sunset
  { key: 'sunrise', example: '🌅 06:12', description: 'Sunrise time with emoji' },
  { key: 'sunrise_noemoji', example: '06:12', description: 'Sunrise time without emoji' },
  { key: 'sunset', example: '🌇 20:45', description: 'Sunset time with emoji' },
  { key: 'sunset_noemoji', example: '20:45', description: 'Sunset time without emoji' },

  // Dynamic next event (sunrise or sunset depending on time of day)
  { key: 'nextsun', example: '🌇 20:45', description: 'Next sun event (sunrise or sunset) with emoji' },
  { key: 'nextsun_noemoji', example: '20:45', description: 'Next sun event (sunrise or sunset) without emoji' },
];

// Slider configuration constants
export const SLIDER_CONFIGS = {
  TEXT_SIZE: { min: 5, max: 100, marks: [5, 50, 100], unit: "px" },
  RADIUS: { min: 0, max: 100, marks: [20, 50, 80], unit: "%" },
  PADDING: { min: 0, max: 100, marks: [20, 50, 80], unit: "px" },
};


