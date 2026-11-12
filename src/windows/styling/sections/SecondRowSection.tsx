import { Group, Space, Switch } from "@mantine/core";
import { useAtom } from "jotai";
import { RESET } from "jotai/utils";
import { ATOMS } from "../../../settings/atoms";
import { SLIDER_CONFIGS } from "../../../settings/options";
import { FormatField } from "../controls/FormatField";
import { SettingsCard } from "../controls/SettingsCard";
import { SliderControl } from "../controls/SliderControl";

export function SecondRowSection()
{
    const [enabled, setEnabled] = useAtom(ATOMS.SECOND_ROW_ENABLED);
    const [gap, setGap] = useAtom(ATOMS.SECOND_ROW_GAP);
    const [textSize, setTextSize] = useAtom(ATOMS.SECOND_ROW_CLOCK_TEXT_SIZE);
    const [format, setFormat] = useAtom(ATOMS.SECOND_ROW_TIME_FORMAT);

    return (
        <SettingsCard title="Second Line Settings">
            <Switch
                checked={enabled}
                onChange={(event) => setEnabled(event.currentTarget.checked)}
                color="teal"
                size="sm"
                label="Enable Second Row"
                mb="md"
            />
            <Group grow>
                <SliderControl label="Gap Size" value={gap} onChange={setGap} disabled={!enabled} {...SLIDER_CONFIGS.PADDING} />
                <SliderControl label="Size" value={textSize} onChange={setTextSize} disabled={!enabled} {...SLIDER_CONFIGS.TEXT_SIZE} />
            </Group>
            <Space h="lg" />
            <Space h="lg" />
            <FormatField
                value={format}
                onCommit={setFormat}
                onRestoreDefault={() => setFormat(RESET)}
                disabled={!enabled}
                minRows={4}
            />
        </SettingsCard>
    );
}
