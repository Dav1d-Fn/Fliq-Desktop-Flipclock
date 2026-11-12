import { Button, ColorInput, Group, Select, SelectProps, Space } from "@mantine/core";
import { useAtom } from "jotai";
import { ATOMS } from "../../../settings/atoms";
import { FONT_OPTIONS, LOCALE_OPTIONS, SLIDER_CONFIGS } from "../../../settings/options";
import { SettingsReset } from "../../../settings/SettingsReset";
import { SettingsCard } from "../controls/SettingsCard";
import { SliderControl } from "../controls/SliderControl";
import { OverlayModeSelect } from "./OverlayModeSelect";

const LANGUAGE_DATA = LOCALE_OPTIONS.map((locale) => ({ value: locale.code, label: locale.name }));

// Each font option is shown in its own font.
const renderFontOption: SelectProps["renderOption"] = ({ option }) => (
    <Group style={{ fontFamily: option.value }} flex="1" gap="xs">
        {option.label}
    </Group>
);

async function resetAllSettings()
{
    if (!window.confirm("Reset all settings to their defaults?"))
    {
        return;
    }
    await SettingsReset.resetAll();
    // The overlay mode select keeps its own copy of the Rust-side value; a reload drops it.
    window.location.reload();
}

export function GeneralSection()
{
    const [language, setLanguage] = useAtom(ATOMS.LANGUAGE);
    const [boxBackground, setBoxBackground] = useAtom(ATOMS.BOX_BACKGROUND);
    const [boxRadius, setBoxRadius] = useAtom(ATOMS.BOX_RADIUS);
    const [clockPadding, setClockPadding] = useAtom(ATOMS.CLOCK_PADDING);
    const [textFont, setTextFont] = useAtom(ATOMS.TEXT_FONT);
    const [textColor, setTextColor] = useAtom(ATOMS.TEXT_COLOR);

    return (
        <SettingsCard title="General Settings">
            <Group grow mt="md">
                <Select
                    label="Language"
                    value={language}
                    onChange={(value) => value && setLanguage(value)}
                    data={LANGUAGE_DATA}
                    labelProps={{ style: { marginBottom: 12 } }}
                />
                <ColorInput
                    label="Background Color"
                    value={boxBackground}
                    onChangeEnd={setBoxBackground}
                    format="hexa"
                    labelProps={{ style: { marginBottom: 12 } }}
                />
            </Group>
            <Group grow mt="md">
                <SliderControl label="Background Rounding" value={boxRadius} onChange={setBoxRadius} {...SLIDER_CONFIGS.RADIUS} />
                <SliderControl label="Padding" value={clockPadding} onChange={setClockPadding} {...SLIDER_CONFIGS.PADDING} />
            </Group>
            <Space h="xs" />
            <Group grow mt="md">
                <Select
                    label="Text Font"
                    value={textFont}
                    onChange={(value) => value && setTextFont(value)}
                    data={FONT_OPTIONS}
                    renderOption={renderFontOption}
                    labelProps={{ style: { marginBottom: 12 } }}
                />
                <ColorInput
                    label="Text Color"
                    value={textColor}
                    onChangeEnd={setTextColor}
                    format="hexa"
                    labelProps={{ style: { marginBottom: 12 } }}
                />
            </Group>
            <OverlayModeSelect />
            <Group justify="flex-end" mt="lg">
                <Button variant="light" color="red" onClick={resetAllSettings}>
                    Reset all settings to defaults
                </Button>
            </Group>
        </SettingsCard>
    );
}
