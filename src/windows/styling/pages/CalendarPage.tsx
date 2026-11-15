import { useCallback, useState } from "react";
import { ActionIcon, Button, Popover, Select, Switch, Text } from "@mantine/core";
import { IconPencil, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useAtom, useAtomValue, useStore } from "jotai";
import { CalendarSync } from "../../../calendar/CalendarSync";
import type { CalendarSource } from "../../../calendar/CalendarTypes";
import type { ParsedCalendar } from "../../../calendar/IcsParser";
import { useStrings } from "../../../i18n/useStrings";
import { ATOMS } from "../../../settings/atoms";
import { SavedToast } from "../controls/SavedToast";
import { SettingRow } from "../controls/SettingRow";
import { SettingsCard } from "../controls/SettingsCard";
import { PageHeader } from "../layout/PageHeader";
import { calendarErrorText, timeAgo } from "./calendar/calendarTexts";
import { SOURCE_COLORS, SourceEditor } from "./calendar/SourceEditor";

const INTERVALS = [5, 15, 30, 60, 120, 240];

// Data › Calendar: the calendars every calendar block can show, and how often they update.
export function CalendarPage()
{
    const [sources, setSources] = useAtom(ATOMS.CALENDAR_SOURCES);
    const [refreshMinutes, setRefreshMinutes] = useAtom(ATOMS.CALENDAR_REFRESH_MINUTES);
    const feeds = useAtomValue(ATOMS.CALENDAR_FEEDS);
    const uiLanguage = useAtomValue(ATOMS.UI_LANGUAGE);
    const store = useStore();
    const text = useStrings().calendar;
    const [editing, setEditing] = useState<{ source: CalendarSource; isNew: boolean } | null>(null);
    const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [savedMessage, setSavedMessage] = useState<{ text: string } | null>(null);
    const hideSavedMessage = useCallback(() => setSavedMessage(null), []);

    const updatedTimes = sources.map((source) => feeds[source.id]?.updatedAt ?? 0).filter((time) => time > 0);
    const lastUpdated = updatedTimes.length > 0 ? Math.max(...updatedTimes) : 0;

    function startAdding()
    {
        const color = SOURCE_COLORS[sources.length % SOURCE_COLORS.length];
        setEditing({ source: { id: crypto.randomUUID(), name: "", url: "", color, enabled: true }, isNew: true });
    }

    function save(source: CalendarSource, loaded: ParsedCalendar | null)
    {
        const exists = sources.some((current) => current.id === source.id);
        setSources(exists ? sources.map((current) => (current.id === source.id ? source : current)) : [...sources, source]);
        if (loaded)
        {
            CalendarSync.store(store, source.id, loaded.events);
        }
        setEditing(null);
        setSavedMessage({ text: text.saved(source.name) });
    }

    function remove(source: CalendarSource)
    {
        setSources(sources.filter((current) => current.id !== source.id));
        store.set(ATOMS.CALENDAR_FEEDS, (current) =>
        {
            const rest = { ...current };
            delete rest[source.id];
            return rest;
        });
        setConfirmingRemove(null);
        setSavedMessage({ text: text.removed(source.name) });
    }

    function setEnabled(source: CalendarSource, enabled: boolean)
    {
        setSources(sources.map((current) => (current.id === source.id ? { ...current, enabled } : current)));
    }

    async function refreshNow()
    {
        setRefreshing(true);
        await CalendarSync.refresh(store).finally(() => setRefreshing(false));
    }

    function statusOf(source: CalendarSource)
    {
        const feed = feeds[source.id];
        if (feed?.error)
        {
            return <Text size="xs" c="red">{text.failedStatus(calendarErrorText(text, feed.error))}</Text>;
        }
        if (!feed || feed.updatedAt === 0)
        {
            return <Text size="xs" c="dimmed">{text.notLoaded}</Text>;
        }
        const upcoming = feed.events.filter((event) => event.end > Date.now()).length;
        return <Text size="xs" c="dimmed">{text.status(upcoming, timeAgo(text, uiLanguage, feed.updatedAt))}</Text>;
    }

    return (
        <>
            <PageHeader title={text.title} intro={text.intro} />

            <SettingsCard title={text.sourcesCard}>
                {sources.length === 0 && (
                    <div className="setting-row">
                        <Text size="sm" c="dimmed">{text.empty}</Text>
                    </div>
                )}
                {sources.map((source) => (
                    <div className="setting-row" key={source.id}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <span aria-hidden style={{ width: 12, height: 12, borderRadius: 6, background: source.color, flex: "none" }} />
                            <div style={{ minWidth: 0 }}>
                                <div className="setting-label">{source.name}</div>
                                {statusOf(source)}
                            </div>
                        </div>
                        <div className="setting-control" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Switch
                                aria-label={text.enabled(source.name)}
                                checked={source.enabled}
                                onChange={(event) => setEnabled(source, event.currentTarget.checked)}
                                mr={8}
                            />
                            <ActionIcon variant="subtle" color="gray" aria-label={text.edit(source.name)} title={text.edit(source.name)} onClick={() => setEditing({ source, isNew: false })}>
                                <IconPencil size={16} />
                            </ActionIcon>
                            <Popover
                                opened={confirmingRemove === source.id}
                                onChange={(open) => setConfirmingRemove(open ? source.id : null)}
                                position="top-end"
                                withArrow
                                shadow="md"
                                width={240}
                            >
                                <Popover.Target>
                                    <ActionIcon
                                        variant="subtle"
                                        color="red"
                                        aria-label={text.remove(source.name)}
                                        title={text.remove(source.name)}
                                        onClick={() => setConfirmingRemove(confirmingRemove === source.id ? null : source.id)}
                                    >
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                </Popover.Target>
                                <Popover.Dropdown>
                                    <p className="saved-layout-confirm">{text.removeConfirm(source.name)}</p>
                                    <div className="saved-layout-confirm-actions">
                                        <Button size="xs" variant="default" onClick={() => setConfirmingRemove(null)}>{text.cancel}</Button>
                                        <Button size="xs" color="red" onClick={() => remove(source)}>{text.removeButton}</Button>
                                    </div>
                                </Popover.Dropdown>
                            </Popover>
                        </div>
                    </div>
                ))}
                <div className="setting-row">
                    <Button variant="light" leftSection={<IconPlus size={16} />} onClick={startAdding}>{text.add}</Button>
                </div>
            </SettingsCard>

            <SettingsCard title={text.updatesCard}>
                <SettingRow label={text.intervalLabel} description={text.intervalDescription}>
                    <Select
                        aria-label={text.intervalLabel}
                        w={140}
                        allowDeselect={false}
                        data={INTERVALS.map((minutes) => ({ value: String(minutes), label: text.minutes(minutes) }))}
                        value={String(refreshMinutes)}
                        onChange={(value) => setRefreshMinutes(Number(value ?? 15))}
                    />
                </SettingRow>
                <SettingRow label={text.lastUpdatedLabel} description={lastUpdated > 0 ? timeAgo(text, uiLanguage, lastUpdated) : text.never}>
                    <Button
                        variant="default"
                        leftSection={<IconRefresh size={16} />}
                        loading={refreshing}
                        disabled={sources.length === 0}
                        onClick={() => void refreshNow()}
                    >
                        {text.refreshNow}
                    </Button>
                </SettingRow>
            </SettingsCard>

            {editing && (
                <SourceEditor
                    source={editing.source}
                    isNew={editing.isNew}
                    onSave={save}
                    onClose={() => setEditing(null)}
                />
            )}
            <SavedToast message={savedMessage} onClose={hideSavedMessage} />
        </>
    );
}
