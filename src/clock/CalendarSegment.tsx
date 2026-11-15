import { CSSProperties, useMemo } from "react";
import { useAtomValue } from "jotai";
import { CalendarEntries } from "../calendar/CalendarEntries";
import type { CalendarBlockSettings, CalendarLayout } from "../calendar/CalendarTypes";
import type { FlipUnit, IconStyle, TextStyle } from "../layout/ClockLayout";
import { useStrings } from "../i18n/useStrings";
import { ATOMS } from "../settings/atoms";
import { withFlatIcons } from "../weather/FlatWeatherIcons";
import { StyledText } from "./StyledText";
import { useSegmentContext } from "./useSegmentContext";

interface CalendarSegmentProps
{
    layout: CalendarLayout;
    settings: CalendarBlockSettings;
    // The current minute (BlockContent's timer): entries are worked out again once a minute
    // and when the feeds change, never per frame.
    now: Date;
    iconStyle: IconStyle;
    // Unset: plain text. Color dots and icons are never styled.
    textStyle?: TextStyle;
    flipUnit?: FlipUnit;
    member?: number;
}

const LINE_STYLE: CSSProperties = { display: "flex", alignItems: "baseline", gap: "0.35em", whiteSpace: "pre" };
const DOT_STYLE: CSSProperties = { fontSize: "0.6em", alignSelf: "center" };
const WHEN_STYLE: CSSProperties = { opacity: 0.7 };

// What a calendar block shows: the next event, a list, or the week strip.
export function CalendarSegment({ layout, settings, now, iconStyle, textStyle, flipUnit, member }: CalendarSegmentProps)
{
    const feeds = useAtomValue(ATOMS.CALENDAR_FEEDS);
    const sources = useAtomValue(ATOMS.CALENDAR_SOURCES);
    const language = useAtomValue(ATOMS.LANGUAGE);
    const { hourCycle } = useSegmentContext();
    const emptyText = useStrings().calendar.nothingPlanned;
    const settingsKey = JSON.stringify(settings);

    const view = useMemo(() =>
    {
        const entries = new CalendarEntries(feeds, sources, now, language, hourCycle);
        return layout === "week"
            ? { kind: "week" as const, days: entries.week(settings, "currentColor") }
            : { kind: "lines" as const, lines: entries.entries(settings, layout) };
    }, [feeds, sources, now, language, hourCycle, layout, settingsKey]);

    const icon = (emoji: string) => (iconStyle === "flat" ? withFlatIcons(emoji) : emoji);
    // Text in the block's text style; plain text stays a plain string as before.
    const styled = (text: string) => (textStyle ? <StyledText text={text} style={textStyle} flipUnit={flipUnit} iconStyle={iconStyle} className="" /> : text);

    if (view.kind === "week")
    {
        return (
            <span className="normal-text-settings calendar-segment" data-member={member} style={{ display: "inline-flex", gap: "0.45em" }}>
                {view.days.map((day, dayIndex) => (
                    <span key={dayIndex} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                        <span style={{ fontWeight: day.today ? 700 : undefined, opacity: day.today ? 1 : 0.75 }}>{styled(day.label)}</span>
                        <span style={{ fontSize: "0.55em", minHeight: "1.2em", letterSpacing: "0.1em" }}>
                            {day.dots.length === 0
                                ? <span style={{ opacity: 0.3 }}>·</span>
                                : day.dots.slice(0, 3).map((color, dotIndex) => <span key={dotIndex} style={{ color }}>●</span>)}
                        </span>
                    </span>
                ))}
            </span>
        );
    }

    if (view.lines.length === 0)
    {
        return (
            <span className="normal-text-settings text-run" data-member={member} style={{ whiteSpace: "pre" }}>
                {styled(settings.emptyText || emptyText)}
            </span>
        );
    }

    return (
        <span className="normal-text-settings calendar-segment" data-member={member} style={{ display: "inline-flex", flexDirection: "column", letterSpacing: "var(--letter-spacing, 0em)" }}>
            {view.lines.map((line, lineIndex) => (
                <span key={lineIndex} style={LINE_STYLE}>
                    {line.color && <span style={{ ...DOT_STYLE, color: line.color }}>●</span>}
                    {line.icon && <span>{icon(line.icon)}</span>}
                    <span style={WHEN_STYLE}>{styled(line.when)}</span>
                    <span>{styled(line.title)}</span>
                </span>
            ))}
        </span>
    );
}
