interface FliqLogoProps
{
    // Edge length of the tile in px; the two cards scale with it.
    size: number;
}

// Two small flip cards, green and white, on a dark tile.
export function FliqLogo({ size }: FliqLogoProps)
{
    const cardWidth = Math.round(size / 3);
    const cardHeight = Math.round(size * 0.45);
    const cardRadius = Math.max(2, Math.round(size / 16));

    return (
        <div
            className="fliq-logo"
            aria-hidden="true"
            style={{ width: size, height: size, borderRadius: Math.round(size / 4), gap: Math.max(2, Math.round(size / 16)) }}
        >
            <span style={{ width: cardWidth, height: cardHeight, borderRadius: cardRadius }} />
            <span style={{ width: cardWidth, height: cardHeight, borderRadius: cardRadius }} />
        </div>
    );
}
