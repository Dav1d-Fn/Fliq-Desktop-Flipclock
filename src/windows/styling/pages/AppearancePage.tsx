import { Group, Select, type SelectProps } from "@mantine/core";
import { useAtom } from "jotai";
import { ATOMS } from "../../../settings/atoms";
import { FONT_OPTIONS, SLIDER_CONFIGS } from "../../../settings/options";
import { ColorField } from "../controls/ColorField";
import { SettingRow } from "../controls/SettingRow";
import { SettingsCard } from "../controls/SettingsCard";
import { SliderControl } from "../controls/SliderControl";
import { PageHeader } from "../layout/PageHeader";

// Each font option is shown in its own font.
const renderFontOption: SelectProps["renderOption"] = ({ option }) => (
    <Group style={{ fontFamily: option.value }} flex="1" gap="xs">
        {option.label}
    </Group>
);

export function AppearancePage()
{
    const [boxBackground, setBoxBackground] = useAtom(ATOMS.BOX_BACKGROUND);
    const [boxRadius, setBoxRadius] = useAtom(ATOMS.BOX_RADIUS);
    const [clockPadding, setClockPadding] = useAtom(ATOMS.CLOCK_PADDING);
    const [textFont, setTextFont] = useAtom(ATOMS.TEXT_FONT);
    const [textColor, setTextColor] = useAtom(ATOMS.TEXT_COLOR);

    return (
        <>
            <PageHeader title="Appearance" intro="How the clock window looks on your desktop." />

            <SettingsCard title="Background">
                <SettingRow label="Color" description="Supports transparency (last two hex digits).">
                    <ColorField label="Background color" value={boxBackground} onChange={setBoxBackground} />
                </SettingRow>
                <SettingRow label="Corner rounding">
                    <SliderControl label="Corner rounding" value={boxRadius} onChange={setBoxRadius} {...SLIDER_CONFIGS.RADIUS} />
                </SettingRow>
                <SettingRow label="Padding">
                    <SliderControl label="Padding" value={clockPadding} onChange={setClockPadding} {...SLIDER_CONFIGS.PADDING} />
                </SettingRow>
            </SettingsCard>

            <SettingsCard title="Text">
                <SettingRow label="Font" description="Used for all text and the flip cards.">
                    <Select
                        aria-label="Font"
                        value={textFont}
                        onChange={(value) => value && setTextFont(value)}
                        data={FONT_OPTIONS}
                        renderOption={renderFontOption}
                        allowDeselect={false}
                        w={200}
                    />
                </SettingRow>
                <SettingRow label="Color" description="Text and weather. Flip card digits are set under Flip Time.">
                    <ColorField label="Text color" value={textColor} onChange={setTextColor} />
                </SettingRow>
            </SettingsCard>
        </>
    );
}
