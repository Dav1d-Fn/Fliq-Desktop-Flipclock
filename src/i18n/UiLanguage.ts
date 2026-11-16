import { LOCALE_OPTIONS, type UiLanguage } from "../settings/options";

function systemLanguageCode(): string
{
    return (navigator.language || "en").slice(0, 2).toLowerCase();
}

// Default of the UI language until one is chosen: the system's, English if it is not offered.
export function systemUiLanguage(): UiLanguage
{
    return systemLanguageCode() === "de" ? "de" : "en";
}

// Default of the date language: the system's if dates can be shown in it, else English.
export function systemDateLanguage(): string
{
    const code = systemLanguageCode();
    return LOCALE_OPTIONS.some((locale) => locale.code === code) ? code : "en";
}
