import type { Strings } from "../../../../i18n/en";

// The message for an error code of CalendarSync.
export function calendarErrorText(text: Strings["calendar"], code: string): string
{
    if (text.errors[code])
    {
        return text.errors[code];
    }
    if (code.startsWith("http-"))
    {
        return text.httpError(code.slice("http-".length));
    }
    return text.errors.offline;
}

// "5 min ago", "just now", in the UI language.
export function timeAgo(text: Strings["calendar"], language: string, time: number, now = Date.now()): string
{
    const minutes = Math.round((now - time) / 60000);
    if (minutes < 1)
    {
        return text.justNow;
    }
    const relative = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
    if (minutes < 60)
    {
        return relative.format(-minutes, "minute");
    }
    if (minutes < 48 * 60)
    {
        return relative.format(-Math.round(minutes / 60), "hour");
    }
    return relative.format(-Math.round(minutes / (24 * 60)), "day");
}
