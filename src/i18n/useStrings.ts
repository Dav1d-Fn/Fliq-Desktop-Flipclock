import { useAtomValue } from "jotai";
import { ATOMS } from "../settings/atoms";
import { DE } from "./de";
import { EN, type Strings } from "./en";
import type { UiLanguage } from "../settings/options";

const DICTIONARIES: Record<UiLanguage, Strings> = { en: EN, de: DE };

// The texts in the chosen UI language. Every window follows a change right away (the setting
// is shared through localStorage).
export function useStrings(): Strings
{
    const language = useAtomValue(ATOMS.UI_LANGUAGE);
    return DICTIONARIES[language] ?? EN;
}

// A text from a block definition or swatch list (English there) in the chosen language.
export function named(strings: Strings, englishText: string): string
{
    return strings.named[englishText] ?? englishText;
}
