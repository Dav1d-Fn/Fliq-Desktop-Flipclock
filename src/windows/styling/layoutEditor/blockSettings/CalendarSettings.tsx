import { MultiSelect, NumberInput, Select, Switch, TextInput } from "@mantine/core";
import { useAtomValue } from "jotai";
import { CALENDAR_DEFAULTS, MAX_RANGE_DAYS, type CalendarBlockSettings, type CalendarRange, type CalendarTimeStyle } from "../../../../calendar/CalendarTypes";
import { useStrings } from "../../../../i18n/useStrings";
import { CONTENT_LIMITS } from "../../../../layout/ClockLayout";
import { ATOMS } from "../../../../settings/atoms";
import type { BlockSettingsProps } from "../BlockEditors";
import { InspectorField } from "../InspectorField";

// Evening switch hour a block starts with when it is turned on.
const DEFAULT_EVENING_HOUR = 18;

// What a calendar block shows: which calendars and events, how many days, how it says when.
// The layout is the display choice above. Sources are set up under Data › Calendar.
export function CalendarSettings({ block, onChange }: BlockSettingsProps)
{
    const text = useStrings().blockCalendar;
    const emptyDefault = useStrings().calendar.nothingPlanned;
    const sources = useAtomValue(ATOMS.CALENDAR_SOURCES);
    const settings = block.calendar ?? {};
    const layout = block.display;
    const range = settings.range ?? CALENDAR_DEFAULTS.range;

    function change(patch: Partial<CalendarBlockSettings>)
    {
        onChange({ calendar: { ...settings, ...patch } });
    }

    const rangeData = [
        { value: "today", label: text.rangeToday },
        { value: "tomorrow", label: text.rangeTomorrow },
        { value: "week", label: text.rangeWeek },
        { value: "days", label: text.rangeDays },
    ];
    const timeData = [
        { value: "relative", label: text.timeRelative },
        { value: "weekday", label: text.timeWeekday },
        { value: "time", label: text.timeFixed },
    ];

    return (
        <>
            <InspectorField label={text.calendars} htmlFor="calendar-sources">
                {sources.length === 0
                    ? <p className="inspector-note">{text.noSources}</p>
                    : (
                        <MultiSelect
                            id="calendar-sources"
                            data={sources.map((source) => ({ value: source.id, label: source.name }))}
                            value={settings.sources ?? []}
                            placeholder={settings.sources?.length ? undefined : text.allCalendars}
                            onChange={(picked) => change({ sources: picked.length > 0 ? picked : undefined })}
                            clearable
                        />
                    )}
            </InspectorField>

            <InspectorField label={text.keywords} htmlFor="calendar-keywords" help={text.keywordsHelp}>
                <TextInput
                    id="calendar-keywords"
                    value={settings.keywords ?? ""}
                    placeholder={text.keywordsPlaceholder}
                    onChange={(event) => change({ keywords: event.currentTarget.value })}
                    maxLength={CONTENT_LIMITS.textLength}
                />
            </InspectorField>

            {layout !== "week" && (
                <InspectorField label={text.range} htmlFor="calendar-range">
                    <Select
                        id="calendar-range"
                        data={rangeData}
                        value={range}
                        allowDeselect={false}
                        onChange={(value) => change({ range: (value ?? "days") as CalendarRange })}
                    />
                    {range === "days" && (
                        <NumberInput
                            mt={8}
                            aria-label={text.days}
                            min={1}
                            max={MAX_RANGE_DAYS}
                            value={settings.days ?? CALENDAR_DEFAULTS.days}
                            onChange={(value) => change({ days: typeof value === "number" ? value : undefined })}
                        />
                    )}
                </InspectorField>
            )}

            {layout === "list" && (
                <InspectorField label={text.maxEntries} htmlFor="calendar-max">
                    <NumberInput
                        id="calendar-max"
                        min={1}
                        max={10}
                        value={settings.maxEntries ?? CALENDAR_DEFAULTS.maxEntries}
                        onChange={(value) => change({ maxEntries: typeof value === "number" ? value : undefined })}
                    />
                </InspectorField>
            )}

            {layout !== "week" && (
                <InspectorField label={text.timeStyle} htmlFor="calendar-time">
                    <Select
                        id="calendar-time"
                        data={timeData}
                        value={settings.timeStyle ?? CALENDAR_DEFAULTS.timeStyle}
                        allowDeselect={false}
                        onChange={(value) => change({ timeStyle: (value ?? "relative") as CalendarTimeStyle })}
                    />
                </InspectorField>
            )}

            <InspectorField label={text.evening} help={text.eveningHelp}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Switch
                        aria-label={text.evening}
                        checked={settings.eveningHour !== undefined}
                        onChange={(event) => change({ eveningHour: event.currentTarget.checked ? DEFAULT_EVENING_HOUR : undefined })}
                    />
                    {settings.eveningHour !== undefined && (
                        <NumberInput
                            aria-label={text.eveningHour}
                            leftSection={<span style={{ fontSize: 12 }}>{text.eveningHour}</span>}
                            leftSectionWidth={36}
                            rightSection={<span style={{ fontSize: 12 }}>:00</span>}
                            min={0}
                            max={23}
                            w={120}
                            value={settings.eveningHour}
                            onChange={(value) => change({ eveningHour: typeof value === "number" ? value : DEFAULT_EVENING_HOUR })}
                        />
                    )}
                </div>
            </InspectorField>

            <Switch
                mt={16}
                label={text.allDay}
                checked={settings.allDay ?? CALENDAR_DEFAULTS.allDay}
                onChange={(event) => change({ allDay: event.currentTarget.checked })}
            />
            {layout !== "week" && (
                <Switch
                    mt={12}
                    label={text.icons}
                    description={text.iconsHelp}
                    checked={settings.icons ?? CALENDAR_DEFAULTS.icons}
                    onChange={(event) => change({ icons: event.currentTarget.checked })}
                />
            )}
            <Switch
                mt={12}
                label={text.colorDot}
                checked={settings.colorDot ?? CALENDAR_DEFAULTS.colorDot}
                onChange={(event) => change({ colorDot: event.currentTarget.checked })}
            />

            {layout !== "week" && (
                <InspectorField label={text.emptyText} htmlFor="calendar-empty">
                    <TextInput
                        id="calendar-empty"
                        value={settings.emptyText ?? ""}
                        placeholder={emptyDefault}
                        onChange={(event) => change({ emptyText: event.currentTarget.value || undefined })}
                        maxLength={CONTENT_LIMITS.textLength}
                    />
                </InspectorField>
            )}
        </>
    );
}
