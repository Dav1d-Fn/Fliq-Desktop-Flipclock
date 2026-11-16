import type { ReactNode } from "react";

export type AnalogVariant = "analogMinimal" | "analogClassic" | "analogFine";

interface AnalogFaceProps
{
    variant: AnalogVariant;
    now: Date;
    withSeconds: boolean;
    member?: number;
}

// Center of the 200 × 200 dial.
const CENTER = 100;

// `count` copies around the dial, each drawn upright at 12 o'clock and turned into place.
function around(count: number, draw: (index: number) => ReactNode): ReactNode[]
{
    return Array.from({ length: count }, (_, index) => (
        <g key={index} transform={`rotate(${index * 360 / count} ${CENTER} ${CENTER})`}>{draw(index)}</g>
    ));
}

// Dial, marks and numerals of each variant. Colors come from faces.css.
function dialOf(variant: AnalogVariant): ReactNode
{
    switch (variant)
    {
        case "analogMinimal":
            return (
                <>
                    <circle className="analog-dial" cx={CENTER} cy={CENTER} r={96} />
                    {around(12, (index) => <circle className="analog-mark" cx={CENTER} cy={14} r={index % 3 === 0 ? 4 : 2.2} />)}
                </>
            );
        case "analogClassic":
            return (
                <>
                    <circle className="analog-dial analog-rim" cx={CENTER} cy={CENTER} r={95} strokeWidth={4} />
                    {around(60, (index) => (
                        <line className="analog-tick" x1={CENTER} y1={10} x2={CENTER} y2={index % 5 === 0 ? 18 : 14} strokeWidth={index % 5 === 0 ? 2.5 : 1} />
                    ))}
                    {Array.from({ length: 12 }, (_, index) =>
                    {
                        const radians = index * Math.PI / 6;
                        return (
                            <text
                                key={index}
                                className="analog-numeral"
                                x={CENTER + Math.sin(radians) * 68}
                                y={CENTER - Math.cos(radians) * 68}
                                textAnchor="middle"
                                dominantBaseline="central"
                            >
                                {index === 0 ? 12 : index}
                            </text>
                        );
                    })}
                </>
            );
        case "analogFine":
            return (
                <>
                    <circle className="analog-dial analog-ring" cx={CENTER} cy={CENTER} r={94} strokeWidth={1} />
                    {around(4, () => <line className="analog-tick" x1={CENTER} y1={8} x2={CENTER} y2={22} strokeWidth={1.5} />)}
                </>
            );
    }
}

// Hour, minute and second hand of each variant, pointing at 12.
function handsOf(variant: AnalogVariant): { hour: ReactNode; minute: ReactNode; second: ReactNode; center: ReactNode }
{
    switch (variant)
    {
        case "analogMinimal":
            return {
                hour: <line className="analog-hand" x1={CENTER} y1={CENTER} x2={CENTER} y2={55} strokeWidth={8} strokeLinecap="round" />,
                minute: <line className="analog-hand" x1={CENTER} y1={CENTER} x2={CENTER} y2={28} strokeWidth={5} strokeLinecap="round" />,
                second: <line className="analog-second" x1={CENTER} y1={112} x2={CENTER} y2={24} strokeWidth={2} strokeLinecap="round" />,
                center: <circle className="analog-second-fill" cx={CENTER} cy={CENTER} r={5} />,
            };
        case "analogClassic":
            return {
                hour: <path className="analog-hand-fill" d="M100 112 L95.5 100 L100 52 L104.5 100 Z" />,
                minute: <path className="analog-hand-fill" d="M100 114 L97 100 L100 22 L103 100 Z" />,
                second: <line className="analog-second" x1={CENTER} y1={118} x2={CENTER} y2={20} strokeWidth={1.2} />,
                center: <circle className="analog-hand-fill" cx={CENTER} cy={CENTER} r={4} />,
            };
        case "analogFine":
            return {
                hour: <line className="analog-hand" x1={CENTER} y1={CENTER} x2={CENTER} y2={58} strokeWidth={2} strokeLinecap="round" />,
                minute: <line className="analog-hand" x1={CENTER} y1={CENTER} x2={CENTER} y2={26} strokeWidth={1.2} strokeLinecap="round" />,
                second: <line className="analog-second" x1={CENTER} y1={CENTER} x2={CENTER} y2={14} strokeWidth={0.8} />,
                center: <circle className="analog-hand-fill" cx={CENTER} cy={CENTER} r={2.5} />,
            };
    }
}

// An analog clock. Hands jump once a second, no animation (cheap under WebKitGTK).
export function AnalogFace({ variant, now, withSeconds, member }: AnalogFaceProps)
{
    const seconds = now.getSeconds();
    const minutes = now.getMinutes() + seconds / 60;
    const hours = (now.getHours() % 12) + minutes / 60;
    const hands = handsOf(variant);
    const turned = (degrees: number, hand: ReactNode) => <g transform={`rotate(${degrees} ${CENTER} ${CENTER})`}>{hand}</g>;

    return (
        <svg className={`clock-face face-analog ${variant}`} data-member={member} viewBox="0 0 200 200">
            {dialOf(variant)}
            {turned(hours * 30, hands.hour)}
            {turned(minutes * 6, hands.minute)}
            {withSeconds && turned(seconds * 6, hands.second)}
            {hands.center}
        </svg>
    );
}
