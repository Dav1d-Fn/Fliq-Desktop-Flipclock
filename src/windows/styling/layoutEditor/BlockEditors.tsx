import type { ComponentType } from "react";
import { IconCalendar, IconCalendarEvent, IconClockHour4, IconCloud, IconLetterT, IconStack2, type Icon } from "@tabler/icons-react";
import type { BlockKind, LayoutBlock } from "../../../layout/ClockLayout";
import { CalendarSettings } from "./blockSettings/CalendarSettings";
import { ClockStylePicker } from "./blockSettings/ClockStylePicker";
import { GroupMembers } from "./blockSettings/GroupMembers";
import { GroupStyleSettings } from "./blockSettings/GroupStyleSettings";
import { IconStyleSettings } from "./blockSettings/IconStyleSettings";
import { TextSettings } from "./blockSettings/TextSettings";
import { WeatherSettings } from "./blockSettings/WeatherSettings";

export interface BlockSettingsProps
{
    block: LayoutBlock;
    onChange: (patch: Partial<LayoutBlock>) => void;
    // Groups: the member whose settings are open (kept by the layout page, so the canvas menu
    // can open one).
    openMember?: number | null;
    onOpenMember?: (index: number | null) => void;
    // A member of a group (ContentEditor in GroupMembers): its look is the group's.
    inGroup?: boolean;
}

// The styling-window side of a block kind (the clock side is its BlockDefinition): the palette
// icon and the settings only this kind has (the colors of text styles and clock faces are
// shared by all, see ClockStyleSettings in BlockInspector). `contentSettings` sit below the display choice,
// `styleSettings` below font and color, `memberSettings` below all shared settings.
interface BlockEditor
{
    icon: Icon;
    contentSettings?: ComponentType<BlockSettingsProps>;
    styleSettings?: ComponentType<BlockSettingsProps>;
    memberSettings?: ComponentType<BlockSettingsProps>;
}

export const BLOCK_EDITORS: Record<BlockKind, BlockEditor> = {
    clock: { icon: IconClockHour4, contentSettings: ClockStylePicker },
    date: { icon: IconCalendar },
    weather: { icon: IconCloud, contentSettings: WeatherSettings, styleSettings: IconStyleSettings },
    calendar: { icon: IconCalendarEvent, contentSettings: CalendarSettings, styleSettings: IconStyleSettings },
    text: { icon: IconLetterT, contentSettings: TextSettings },
    group: { icon: IconStack2, styleSettings: GroupStyleSettings, memberSettings: GroupMembers },
};
