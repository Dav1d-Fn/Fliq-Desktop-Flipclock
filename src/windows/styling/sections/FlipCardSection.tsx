import { ColorInput, Group, Space, Text } from "@mantine/core";
import { useAtom } from "jotai";
import { ATOMS } from "../../../settings/atoms";
import { SLIDER_CONFIGS } from "../../../settings/options";
import { DraftTextInput } from "../controls/DraftTextInput";
import { SettingsCard } from "../controls/SettingsCard";
import { SliderControl } from "../controls/SliderControl";

export function FlipCardSection()
{
    const [separatorColor, setSeparatorColor] = useAtom(ATOMS.CLOCK_SEPARATOR_COLOR);
    const [textColor, setTextColor] = useAtom(ATOMS.CLOCK_TEXT_COLOR);
    const [background, setBackground] = useAtom(ATOMS.FLIPCARD_BACKGROUND);
    const [radius, setRadius] = useAtom(ATOMS.FLIPCARD_RADIUS);
    const [separatorString, setSeparatorString] = useAtom(ATOMS.SEPARATOR_STRING);

    return (
        <SettingsCard title="$FLIPTIME Settings">
            <Group grow>
                <ColorInput
                    label="Separator Color"
                    value={separatorColor}
                    onChangeEnd={setSeparatorColor}
                    format="hexa"
                    labelProps={{ style: { marginBottom: 12 } }}
                />
                <ColorInput
                    label="Text Color"
                    value={textColor}
                    onChangeEnd={setTextColor}
                    format="hexa"
                    labelProps={{ style: { marginBottom: 12 } }}
                />
                <ColorInput
                    label="Flip Card Background"
                    value={background}
                    onChangeEnd={setBackground}
                    format="hexa"
                    labelProps={{ style: { marginBottom: 12 } }}
                />
            </Group>
            <Group grow mt="md">
                <SliderControl label="Rounding (%)" value={radius} onChange={setRadius} {...SLIDER_CONFIGS.RADIUS} />
                <div>
                    <Text mb={10} size="sm" fw={500}>Separator Characters</Text>
                    <DraftTextInput value={separatorString} onCommit={setSeparatorString} ariaLabel="Separator characters" />
                </div>
            </Group>
            <Space h="sm" />
        </SettingsCard>
    );
}
