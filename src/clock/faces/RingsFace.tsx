interface RingsFaceProps
{
    now: Date;
    // Hours and minutes in the middle.
    label: string;
    withSeconds: boolean;
    member?: number;
}

const RING_WIDTH = 10;

// Progress rings for hours (outside), minutes and seconds around the time.
export function RingsFace({ now, label, withSeconds, member }: RingsFaceProps)
{
    const minutes = now.getMinutes() + now.getSeconds() / 60;
    const rings = [
        { className: "ring-hours", radius: 90, share: ((now.getHours() % 12) + minutes / 60) / 12 },
        { className: "ring-minutes", radius: 74, share: minutes / 60 },
        ...(withSeconds ? [{ className: "ring-seconds", radius: 58, share: now.getSeconds() / 60 }] : []),
    ];

    return (
        <svg className="clock-face face-rings" data-member={member} viewBox="0 0 200 200">
            {rings.map((ring) =>
            {
                const length = 2 * Math.PI * ring.radius;
                // A dot at 0, so an empty ring still shows where it starts.
                const shown = Math.max(ring.share, 0.004) * length;
                return (
                    <g key={ring.className} className={ring.className} transform="rotate(-90 100 100)">
                        <circle className="ring-track" cx={100} cy={100} r={ring.radius} strokeWidth={RING_WIDTH} />
                        <circle className="ring-fill" cx={100} cy={100} r={ring.radius} strokeWidth={RING_WIDTH} strokeDasharray={`${shown} ${length}`} />
                    </g>
                );
            })}
            <text className="ring-label" x={100} y={100} fontSize={withSeconds ? 34 : 44} textAnchor="middle" dominantBaseline="central">{label}</text>
        </svg>
    );
}
