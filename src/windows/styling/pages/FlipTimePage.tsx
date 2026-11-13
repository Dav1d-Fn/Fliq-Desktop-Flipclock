import { useAtom } from "jotai";
import { ATOMS } from "../../../settings/atoms";
import { SLIDER_CONFIGS } from "../../../settings/options";
import { ColorField } from "../controls/ColorField";
import { DraftTextInput } from "../controls/DraftTextInput";
import { SettingRow } from "../controls/SettingRow";
import { SettingsCard } from "../controls/SettingsCard";
import { SliderControl } from "../controls/SliderControl";
import { PageHeader } from "../layout/PageHeader";
import { UsageBadge } from "../layout/UsageBadge";

export function FlipTimePage()
{
    const [background, setBackground] = useAtom(ATOMS.FLIPCARD_BACKGROUND);
    const [digitColor, setDigitColor] = useAtom(ATOMS.CLOCK_TEXT_COLOR);
    const [radius, setRadius] = useAtom(ATOMS.FLIPCARD_RADIUS);
    const [separatorString, setSeparatorString] = useAtom(ATOMS.SEPARATOR_STRING);
    const [separatorColor, setSeparatorColor] = useAtom(ATOMS.CLOCK_SEPARATOR_COLOR);

    return (
        <>
            <PageHeader
                title="Flip Time"
                intro={<>Styles the <code className="token-chip">$FLIPTIME</code> token.</>}
                aside={<UsageBadge type="FLIPTIME" />}
            />

            <SettingsCard title="Cards">
                <SettingRow label="Card background">
                    <ColorField label="Card background" value={background} onChange={setBackground} />
                </SettingRow>
                <SettingRow label="Digit color">
                    <ColorField label="Digit color" value={digitColor} onChange={setDigitColor} />
                </SettingRow>
                <SettingRow label="Card rounding">
                    <SliderControl label="Card rounding" value={radius} onChange={setRadius} {...SLIDER_CONFIGS.RADIUS} />
                </SettingRow>
            </SettingsCard>

            <SettingsCard title="Separators">
                <SettingRow label="Characters" description="These characters stay static between the cards.">
                    <DraftTextInput
                        ariaLabel="Separator characters"
                        value={separatorString}
                        onCommit={setSeparatorString}
                        monospace
                        width={200}
                    />
                </SettingRow>
                <SettingRow label="Color">
                    <ColorField label="Separator color" value={separatorColor} onChange={setSeparatorColor} />
                </SettingRow>
            </SettingsCard>
        </>
    );
}
