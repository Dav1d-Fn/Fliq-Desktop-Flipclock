import type { BlockKind } from "../layout/ClockLayout.ts";
import type { BlockDefinition } from "./BlockDefinition.ts";
import { CLOCK_BLOCK } from "./ClockTimeBlock.ts";
import { DATE_BLOCK } from "./DateBlock.ts";
import { GROUP_BLOCK } from "./GroupBlock.ts";
import { TEXT_BLOCK } from "./TextBlock.ts";
import { WEATHER_BLOCK } from "./WeatherBlock.ts";

// Every block kind of the palette, in palette order. Groups are not in it (see GroupBlock).
export const BLOCK_DEFINITIONS: BlockDefinition[] = [CLOCK_BLOCK, DATE_BLOCK, WEATHER_BLOCK, TEXT_BLOCK];

export function blockDefinition(kind: BlockKind): BlockDefinition
{
    if (kind === "group")
    {
        return GROUP_BLOCK;
    }
    return BLOCK_DEFINITIONS.find((definition) => definition.kind === kind) ?? TEXT_BLOCK;
}
