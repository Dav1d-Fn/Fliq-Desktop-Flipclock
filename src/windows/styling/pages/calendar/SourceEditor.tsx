import { useState } from "react";
import { Button, ColorInput, Group, Modal, PasswordInput, Text, TextInput } from "@mantine/core";
import { useAtomValue } from "jotai";
import { CalendarSync } from "../../../../calendar/CalendarSync";
import type { CalendarSource } from "../../../../calendar/CalendarTypes";
import { EventFormatter } from "../../../../calendar/EventFormatter";
import type { ParsedCalendar } from "../../../../calendar/IcsParser";
import { useSegmentContext } from "../../../../clock/useSegmentContext";
import { useStrings } from "../../../../i18n/useStrings";
import { ATOMS } from "../../../../settings/atoms";
import { calendarErrorText } from "./calendarTexts";

// Colors offered for a new calendar, in turn.
export const SOURCE_COLORS = ["#4f8cff", "#34c77b", "#ff9f43", "#ff5c7a", "#b38cff", "#2ec4c4", "#f5d547", "#a0a0a0"];

interface SourceEditorProps
{
    // The calendar being edited, or a new one (empty url).
    source: CalendarSource;
    isNew: boolean;
    onSave: (source: CalendarSource, loaded: ParsedCalendar | null) => void;
    onClose: () => void;
}

type CheckState =
    | { status: "idle" }
    | { status: "checking" }
    | { status: "ok"; url: string; calendar: ParsedCalendar }
    | { status: "failed"; url: string; error: string };

// Add or edit one calendar: the secret link (checked by downloading it), name and color. A
// link is only saved once it loaded; a name or color change alone saves right away.
export function SourceEditor({ source, isNew, onSave, onClose }: SourceEditorProps)
{
    const text = useStrings().calendar;
    const language = useAtomValue(ATOMS.LANGUAGE);
    const { hourCycle } = useSegmentContext();
    const [url, setUrl] = useState(source.url);
    const [name, setName] = useState(source.name);
    const [color, setColor] = useState(source.color);
    const [check, setCheck] = useState<CheckState>({ status: "idle" });
    const trimmedUrl = url.trim();
    const urlChanged = trimmedUrl !== source.url;

    async function runCheck(): Promise<ParsedCalendar | null>
    {
        setCheck({ status: "checking" });
        try
        {
            const calendar = await CalendarSync.load(trimmedUrl, source.id);
            setCheck({ status: "ok", url: trimmedUrl, calendar });
            return calendar;
        }
        catch (error)
        {
            setCheck({ status: "failed", url: trimmedUrl, error: CalendarSync.errorCode(error) });
            return null;
        }
    }

    async function save()
    {
        let loaded: ParsedCalendar | null = null;
        if (urlChanged || isNew)
        {
            loaded = check.status === "ok" && check.url === trimmedUrl ? check.calendar : await runCheck();
            if (!loaded)
            {
                return;
            }
        }
        const fallbackName = loaded?.name || source.name || text.title;
        onSave({ ...source, url: trimmedUrl, name: name.trim() || fallbackName, color }, loaded);
    }

    function preview()
    {
        if (check.status === "checking")
        {
            return <Text size="sm" c="dimmed">{text.checking}</Text>;
        }
        if (check.status === "failed" && check.url === trimmedUrl)
        {
            return <Text size="sm" c="red">{calendarErrorText(text, check.error)}</Text>;
        }
        if (check.status !== "ok" || check.url !== trimmedUrl)
        {
            return null;
        }
        const now = Date.now();
        const upcoming = check.calendar.events.filter((event) => event.end > now);
        const next = upcoming[0];
        const formatter = new EventFormatter(new Date(), language, hourCycle);
        const shownName = name.trim() || check.calendar.name || text.title;
        return (
            <Text size="sm" c="teal.4">
                {text.found(shownName, upcoming.length)}
                {" · "}
                {next ? text.next(formatter.when(next, "time"), next.title) : text.noUpcoming}
            </Text>
        );
    }

    return (
        <Modal opened onClose={onClose} title={isNew ? text.addTitle : text.editTitle} size="lg" centered>
            <PasswordInput
                label={text.urlLabel}
                description={text.urlDescription}
                placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
                value={url}
                onChange={(event) => setUrl(event.currentTarget.value)}
                spellCheck={false}
                autoComplete="off"
                data-autofocus
            />
            <Group mt={8} gap={12} wrap="nowrap" align="center">
                <Button variant="default" size="xs" style={{ flex: "none" }} disabled={trimmedUrl === "" || check.status === "checking"} onClick={() => void runCheck()}>
                    {text.check}
                </Button>
                <div style={{ minWidth: 0 }}>{preview()}</div>
            </Group>

            <Group mt={16} grow align="flex-start">
                <TextInput
                    label={text.nameLabel}
                    placeholder={check.status === "ok" && check.calendar.name ? check.calendar.name : text.namePlaceholder}
                    value={name}
                    onChange={(event) => setName(event.currentTarget.value)}
                />
                <ColorInput
                    label={text.colorLabel}
                    value={color}
                    onChange={setColor}
                    swatches={SOURCE_COLORS}
                    swatchesPerRow={8}
                />
            </Group>

            <Group mt={24} justify="flex-end">
                <Button variant="default" onClick={onClose}>{text.cancel}</Button>
                <Button
                    loading={check.status === "checking"}
                    disabled={trimmedUrl === ""}
                    onClick={() => void save()}
                >
                    {text.save}
                </Button>
            </Group>
        </Modal>
    );
}
