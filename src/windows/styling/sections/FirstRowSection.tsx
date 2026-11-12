import { Space } from "@mantine/core";
import { useAtom } from "jotai";
import { RESET } from "jotai/utils";
import { ATOMS } from "../../../settings/atoms";
import { SLIDER_CONFIGS } from "../../../settings/options";
import { FormatField } from "../controls/FormatField";
import { SettingsCard } from "../controls/SettingsCard";
import { SliderControl } from "../controls/SliderControl";

export function FirstRowSection()
{
    const [textSize, setTextSize] = useAtom(ATOMS.CLOCK_TEXT_SIZE);
    const [format, setFormat] = useAtom(ATOMS.TIME_FORMAT);

    return (
        <SettingsCard title="First Line Settings">
            <SliderControl label="Size" value={textSize} onChange={setTextSize} {...SLIDER_CONFIGS.TEXT_SIZE} />
            <Space h="xl" />
            <FormatField value={format} onCommit={setFormat} onRestoreDefault={() => setFormat(RESET)} />
        </SettingsCard>
    );
}
