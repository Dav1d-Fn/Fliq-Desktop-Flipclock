import { useEffect, useRef } from "react";
import { ActionIcon, UnstyledButton } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconX } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { blockDefinition } from "../../../../blocks/BlockRegistry";
import { useCalendarText } from "../../../../calendar/useCalendarText";
import { ClockTemplate } from "../../../../clock/ClockTemplate";
import { useSegmentContext } from "../../../../clock/useSegmentContext";
import type { GroupItem, LayoutBlock } from "../../../../layout/ClockLayout";
import { named, useStrings } from "../../../../i18n/useStrings";
import { ATOMS } from "../../../../settings/atoms";
import { WeatherFormatter } from "../../../../weather/WeatherFormatter";
import { BLOCK_EDITORS, type BlockSettingsProps } from "../BlockEditors";
import { ContentEditor } from "../ContentEditor";
import { InspectorField } from "../InspectorField";

// The members of a group, left to right: reorder, remove, and open one to change what it shows
// (its look is the group's).
export function GroupMembers({ block, onChange, openMember, onOpenMember }: BlockSettingsProps)
{
    const items = block.items ?? [];
    const openIndex = openMember ?? null;
    const setOpenIndex = (index: number | null) => onOpenMember?.(index);
    const listRef = useRef<HTMLDivElement>(null);
    const weatherReport = useAtomValue(ATOMS.WEATHER_REPORT);
    const sunDays = useAtomValue(ATOMS.SUN_DAYS);
    const weatherUnit = useAtomValue(ATOMS.WEATHER_UNIT);
    const segmentContext = useSegmentContext();
    const calendarText = useCalendarText();
    const strings = useStrings();
    const text = strings.group;
    const weather = new WeatherFormatter(weatherReport, sunDays, weatherUnit, new Date());

    // Opened from the canvas menu: bring it into view.
    useEffect(() =>
    {
        listRef.current?.querySelector(".group-member.selected")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, [openIndex]);

    function setItems(next: GroupItem[])
    {
        onChange({ items: next });
    }

    function move(index: number, step: number)
    {
        const next = [...items];
        [next[index], next[index + step]] = [next[index + step], next[index]];
        setItems(next);
        if (openIndex === index)
        {
            setOpenIndex(index + step);
        }
        else if (openIndex === index + step)
        {
            setOpenIndex(index);
        }
    }

    function remove(index: number)
    {
        setItems(items.filter((_, itemIndex) => itemIndex !== index));
        setOpenIndex(null);
    }

    // Only content fields reach a member; the rest of the patch would be the group's look.
    function changeItem(index: number, patch: Partial<LayoutBlock>)
    {
        const { display, customFormat, text, weatherIcon, clockStyle, calendar, progressShape, progressUnit, progressMotion } = { ...items[index], ...patch };
        // A member's own text style (from the migration) is not content, but it stays.
        const { textStyle } = items[index];
        const item: GroupItem = { kind: items[index].kind, display, customFormat, text, weatherIcon, clockStyle, calendar, progressShape, progressUnit, progressMotion, textStyle };
        setItems(items.map((current, itemIndex) => (itemIndex === index ? item : current)));
    }

    return (
        <InspectorField label={text.items} help={text.itemsNote}>
            <div className="group-members" ref={listRef}>
                {items.map((item, index) =>
                {
                    const definition = blockDefinition(item.kind);
                    const name = named(strings, definition.name);
                    const Icon = BLOCK_EDITORS[item.kind].icon;
                    const merged = { ...block, ...item };
                    const preview = new ClockTemplate(definition.segments(merged, segmentContext)).plainText((key) => weather.format(key), calendarText);
                    const open = openIndex === index;
                    return (
                        <div key={index} className={open ? "group-member selected" : "group-member"}>
                            <div className="group-member-row">
                                <UnstyledButton
                                    className="group-member-name"
                                    aria-expanded={open}
                                    onClick={() => setOpenIndex(open ? null : index)}
                                >
                                    <Icon size={16} />
                                    <span>{name}</span>
                                    <span className="group-member-preview">{preview}</span>
                                </UnstyledButton>
                                <ActionIcon variant="subtle" size={26} aria-label={text.moveLeft(name)} disabled={index === 0} onClick={() => move(index, -1)}>
                                    <IconArrowUp size={15} />
                                </ActionIcon>
                                <ActionIcon variant="subtle" size={26} aria-label={text.moveRight(name)} disabled={index === items.length - 1} onClick={() => move(index, 1)}>
                                    <IconArrowDown size={15} />
                                </ActionIcon>
                                <ActionIcon variant="subtle" size={26} c="red.8" aria-label={text.remove(name)} disabled={items.length === 1} onClick={() => remove(index)}>
                                    <IconX size={15} />
                                </ActionIcon>
                            </div>
                            {open && (
                                <div className="group-member-settings">
                                    <ContentEditor block={merged} onChange={(patch) => changeItem(index, patch)} inGroup />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </InspectorField>
    );
}
