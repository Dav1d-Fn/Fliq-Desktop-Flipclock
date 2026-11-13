import { Switch } from "@mantine/core";
import { useAtom } from "jotai";
import { RESET } from "jotai/utils";
import { ATOMS } from "../../../settings/atoms";
import { SLIDER_CONFIGS } from "../../../settings/options";
import { FormatField } from "../controls/FormatField";
import { SettingRow } from "../controls/SettingRow";
import { SettingsCard } from "../controls/SettingsCard";
import { SliderControl } from "../controls/SliderControl";
import { PageHeader } from "../layout/PageHeader";
import type { PageProps } from "../SettingsPages";

export function LinesPage({ navigate }: PageProps)
{
    const [firstFormat, setFirstFormat] = useAtom(ATOMS.TIME_FORMAT);
    const [firstSize, setFirstSize] = useAtom(ATOMS.CLOCK_TEXT_SIZE);
    const [secondEnabled, setSecondEnabled] = useAtom(ATOMS.SECOND_ROW_ENABLED);
    const [secondFormat, setSecondFormat] = useAtom(ATOMS.SECOND_ROW_TIME_FORMAT);
    const [secondSize, setSecondSize] = useAtom(ATOMS.SECOND_ROW_CLOCK_TEXT_SIZE);
    const [gap, setGap] = useAtom(ATOMS.SECOND_ROW_GAP);

    const intro = (
        <>
            What each line shows. Mix text with{" "}
            <button type="button" className="text-link" onClick={() => navigate("tokens")}>format tokens</button>.
        </>
    );

    return (
        <>
            <PageHeader title="Lines & Format" intro={intro} />

            <SettingsCard title="First line">
                <SettingRow stacked>
                    <FormatField
                        id="first-line-format"
                        value={firstFormat}
                        onCommit={setFirstFormat}
                        onRestoreDefault={() => setFirstFormat(RESET)}
                    />
                </SettingRow>
                <SettingRow label="Size">
                    <SliderControl label="First line size" value={firstSize} onChange={setFirstSize} {...SLIDER_CONFIGS.TEXT_SIZE} />
                </SettingRow>
            </SettingsCard>

            <SettingsCard title="Second line">
                <SettingRow label="Show second line" description="A smaller line below the clock, e.g. date or weather.">
                    <Switch
                        aria-label="Show second line"
                        checked={secondEnabled}
                        onChange={(event) => setSecondEnabled(event.currentTarget.checked)}
                        size="md"
                    />
                </SettingRow>
                {secondEnabled && (
                    <>
                        <SettingRow stacked>
                            <FormatField
                                id="second-line-format"
                                value={secondFormat}
                                onCommit={setSecondFormat}
                                onRestoreDefault={() => setSecondFormat(RESET)}
                            />
                        </SettingRow>
                        <SettingRow label="Size">
                            <SliderControl label="Second line size" value={secondSize} onChange={setSecondSize} {...SLIDER_CONFIGS.TEXT_SIZE} />
                        </SettingRow>
                        <SettingRow label="Gap" description="Space between first and second line.">
                            <SliderControl label="Gap" value={gap} onChange={setGap} {...SLIDER_CONFIGS.PADDING} />
                        </SettingRow>
                    </>
                )}
            </SettingsCard>
        </>
    );
}
