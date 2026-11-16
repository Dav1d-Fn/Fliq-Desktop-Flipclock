import { useAtomValue } from "jotai";
import type { Segment } from "../clock/ClockTemplate";
import { useSegmentContext } from "../clock/useSegmentContext";
import { useStrings } from "../i18n/useStrings";
import { ATOMS } from "../settings/atoms";
import { CalendarEntries } from "./CalendarEntries";
import type { CalendarLayout } from "./CalendarTypes";

// A calendar segment as one line of plain text right now, for ClockTemplate.plainText
// (previews in the settings window).
export function useCalendarText(): (segment: Segment) => string
{
    const feeds = useAtomValue(ATOMS.CALENDAR_FEEDS);
    const sources = useAtomValue(ATOMS.CALENDAR_SOURCES);
    const language = useAtomValue(ATOMS.LANGUAGE);
    const { hourCycle } = useSegmentContext();
    const emptyText = useStrings().calendar.nothingPlanned;
    const entries = new CalendarEntries(feeds, sources, new Date(), language, hourCycle);
    return (segment) => entries.plainText(segment.calendar ?? {}, segment.value as CalendarLayout, emptyText);
}
