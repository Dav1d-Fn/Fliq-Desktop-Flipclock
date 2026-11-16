import { LayoutGrid, type ClockStyle, type LayoutBlock, type TextStyle } from "../../../../layout/ClockLayout";
import { itemTextStyle, settingsOf } from "../../../../blocks/StyleSettings";
import { useStrings } from "../../../../i18n/useStrings";
import { SliderControl } from "../../controls/SliderControl";
import type { BlockSettingsProps } from "../BlockEditors";
import { ColorSwatches } from "../ColorSwatches";
import { DIAL_SWATCHES, GLOW_SWATCHES, HAND_SWATCHES, type Swatch } from "../EditorSwatches";
import { InspectorField } from "../InspectorField";
import { FlipCardSettings } from "./FlipCardSettings";
import { SecondsBarSettings } from "./SecondsBarSettings";

// Each style's own colors, shown on the "default" swatch. Same values as faces.css.
const GLOW_DEFAULTS: Partial<Record<TextStyle, string>> = { segment: "#ff3b30", dots: "#7fdcff", nixie: "#ffa64d" };
const ANALOG_DEFAULTS: Partial<Record<ClockStyle, { dial: string; hand: string; second: string }>> = {
    analogMinimal: { dial: "#20242b", hand: "#f2f4f7", second: "#ff5a4e" },
    analogClassic: { dial: "#f3efe6", hand: "#222222", second: "#b8322a" },
    analogFine: { dial: "#00000000", hand: "#ffffff", second: "#7fdcff" },
};
const RING_DEFAULTS = { hour: "#ff5a4e", minute: "#ffb547", second: "#6fe3a6" };

type ColorFieldName = "glowColor" | "dialColor" | "handColor" | "secondHandColor" | "hourRingColor" | "minuteRingColor" | "secondRingColor";

interface ColorFieldProps extends BlockSettingsProps
{
    field: ColorFieldName;
    label: string;
    swatches: Swatch[];
    defaultColor: string | undefined;
}

function ColorField({ block, onChange, field, label, swatches, defaultColor }: ColorFieldProps)
{
    return (
        <InspectorField label={label}>
            <ColorSwatches
                label={label}
                value={block[field]}
                onChange={(color) => onChange({ [field]: color } as Partial<LayoutBlock>)}
                swatches={swatches}
                defaultColor={defaultColor}
            />
        </InspectorField>
    );
}

// What the text style and clock faces a block shows draw with, only what they use (settingsOf): card
// settings for flip, glow color for the lit styles, dial and hand colors for analog, ring
// colors and the time's size for rings, progress colors (and bar size). For a group, of every
// member's style.
export function ClockStyleSettings({ block, onChange }: BlockSettingsProps)
{
    const text = useStrings().clockStyle;
    const settings = settingsOf(block);
    const items = LayoutGrid.itemsOf(block);
    const glowStyle = items.map((item) => itemTextStyle(item, block)).find((style) => GLOW_DEFAULTS[style]);
    const analogStyle = items.map((item) => item.clockStyle ?? "digital").find((style) => ANALOG_DEFAULTS[style]);
    const analog = analogStyle ? ANALOG_DEFAULTS[analogStyle] : undefined;
    const fieldProps = { block, onChange };

    return (
        <>
            {settings.has("cards") && <FlipCardSettings block={block} onChange={onChange} />}
            {settings.has("progressColors") && <SecondsBarSettings block={block} onChange={onChange} withBarShape={settings.has("barShape")} />}
            {settings.has("glowColor") && (
                <ColorField {...fieldProps} field="glowColor" label={text.glowColor} swatches={GLOW_SWATCHES} defaultColor={glowStyle && GLOW_DEFAULTS[glowStyle]} />
            )}
            {settings.has("dialColor") && (
                <ColorField {...fieldProps} field="dialColor" label={text.dialColor} swatches={DIAL_SWATCHES} defaultColor={analog?.dial} />
            )}
            {settings.has("handColor") && (
                <ColorField {...fieldProps} field="handColor" label={text.handColor} swatches={HAND_SWATCHES} defaultColor={analog?.hand} />
            )}
            {settings.has("secondHandColor") && (
                <ColorField {...fieldProps} field="secondHandColor" label={text.secondHandColor} swatches={GLOW_SWATCHES} defaultColor={analog?.second} />
            )}
            {settings.has("hourRingColor") && (
                <ColorField {...fieldProps} field="hourRingColor" label={text.hourRingColor} swatches={GLOW_SWATCHES} defaultColor={RING_DEFAULTS.hour} />
            )}
            {settings.has("minuteRingColor") && (
                <ColorField {...fieldProps} field="minuteRingColor" label={text.minuteRingColor} swatches={GLOW_SWATCHES} defaultColor={RING_DEFAULTS.minute} />
            )}
            {settings.has("secondRingColor") && (
                <ColorField {...fieldProps} field="secondRingColor" label={text.secondRingColor} swatches={GLOW_SWATCHES} defaultColor={RING_DEFAULTS.second} />
            )}
            {settings.has("labelSize") && (
                <InspectorField label={text.labelSize}>
                    <SliderControl
                        label={text.labelSize}
                        value={block.labelSize ?? 100}
                        onChange={(labelSize) => onChange({ labelSize })}
                        min={0}
                        max={120}
                        marks={[]}
                        unit="%"
                    />
                </InspectorField>
            )}
        </>
    );
}
