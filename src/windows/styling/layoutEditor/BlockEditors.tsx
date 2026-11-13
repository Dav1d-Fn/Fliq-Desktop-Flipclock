import type { ComponentType } from "react";
import { IconCalendar, IconClockHour4, IconCloud, IconLayoutColumns, IconLetterT, IconStack2, type Icon } from "@tabler/icons-react";
import type { BlockKind, LayoutBlock } from "../../../layout/ClockLayout";
import { FlipCardSettings } from "./blockSettings/FlipCardSettings";
import { GroupMembers } from "./blockSettings/GroupMembers";
import { GroupStyleSettings } from "./blockSettings/GroupStyleSettings";
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
}

// The styling-window side of a block kind (the clock side is its BlockDefinition): the palette
// icon and the settings only this kind has. `contentSettings` sit below the display choice,
// `styleSettings` below font and color, `memberSettings` below all shared settings.
interface BlockEditor
{
    icon: Icon;
    contentSettings?: ComponentType<BlockSettingsProps>;
    styleSettings?: ComponentType<BlockSettingsProps>;
    memberSettings?: ComponentType<BlockSettingsProps>;
}

export const BLOCK_EDITORS: Record<BlockKind, BlockEditor> = {
    flip: { icon: IconLayoutColumns, styleSettings: FlipCardSettings },
    time: { icon: IconClockHour4 },
    date: { icon: IconCalendar },
    weather: { icon: IconCloud, contentSettings: WeatherSettings },
    text: { icon: IconLetterT, contentSettings: TextSettings },
    group: { icon: IconStack2, styleSettings: GroupStyleSettings, memberSettings: GroupMembers },
};
