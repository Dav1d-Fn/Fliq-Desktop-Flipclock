import { Select } from "@mantine/core";
import { EFFECT_SPEED_RANGE, EFFECT_STRENGTH_RANGE, effectsOf, effectVariantsOf } from "../../../../blocks/StyleSettings";
import type { EffectVariant, TextEffect } from "../../../../layout/ClockLayout";
import { useStrings } from "../../../../i18n/useStrings";
import { SliderControl } from "../../controls/SliderControl";
import type { BlockSettingsProps } from "../BlockEditors";
import { InspectorField } from "../InspectorField";
import { InspectorGroup } from "../InspectorGroup";

const NO_EFFECT = "none";
const SLIDER_STEP = 5;

// The optional animation of a lit text style: only the effects its style offers (effectsOf),
// then the chosen one's speed, strength and variants (effectVariantsOf, the first is the
// original look and stays unset).
export function EffectSelect({ block, onChange }: BlockSettingsProps)
{
    const text = useStrings().clockStyle;
    const effects = effectsOf(block);
    if (effects.length === 0)
    {
        return null;
    }
    const effect = block.effect && effects.includes(block.effect) ? block.effect : undefined;
    const variants = effectVariantsOf(block);
    const variant = block.effectVariant && variants.includes(block.effectVariant) ? block.effectVariant : variants[0];

    // A new effect starts with its original variant; speed and strength carry over.
    function changeEffect(chosen: string | null)
    {
        const nextEffect = chosen === NO_EFFECT || !chosen ? undefined : chosen as TextEffect;
        onChange({ effect: nextEffect, effectVariant: undefined });
    }

    function changeVariant(chosen: string | null)
    {
        const nextVariant = chosen as EffectVariant | null;
        onChange({ effectVariant: !nextVariant || nextVariant === variants[0] ? undefined : nextVariant });
    }

    return (
        <InspectorGroup>
            <InspectorField label={text.effect} help={text.effectNote} htmlFor="block-effect">
                <Select
                    id="block-effect"
                    value={effect ?? NO_EFFECT}
                    onChange={changeEffect}
                    data={[NO_EFFECT, ...effects].map((name) => ({ value: name, label: text.effects[name as TextEffect | typeof NO_EFFECT] }))}
                    allowDeselect={false}
                />
            </InspectorField>
            {effect && variants.length > 0 && (
                <InspectorField label={text.effectVariantLabels[effect]} htmlFor="block-effect-variant">
                    <Select
                        id="block-effect-variant"
                        value={variant}
                        onChange={changeVariant}
                        data={variants.map((name) => ({ value: name, label: text.effectVariants[name] }))}
                        allowDeselect={false}
                    />
                </InspectorField>
            )}
            {effect && (
                <InspectorField label={text.effectSpeed}>
                    <SliderControl
                        label={text.effectSpeed}
                        value={block.effectSpeed ?? 100}
                        onChange={(effectSpeed) => onChange({ effectSpeed })}
                        min={EFFECT_SPEED_RANGE.min}
                        max={EFFECT_SPEED_RANGE.max}
                        step={SLIDER_STEP}
                        marks={[]}
                        unit="%"
                    />
                </InspectorField>
            )}
            {effect && (
                <InspectorField label={text.effectStrength}>
                    <SliderControl
                        label={text.effectStrength}
                        value={block.effectStrength ?? 100}
                        onChange={(effectStrength) => onChange({ effectStrength })}
                        min={EFFECT_STRENGTH_RANGE.min}
                        max={EFFECT_STRENGTH_RANGE.max}
                        step={SLIDER_STEP}
                        marks={[]}
                        unit="%"
                    />
                </InspectorField>
            )}
        </InspectorGroup>
    );
}
