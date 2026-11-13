interface FliqLogoProps
{
    // Edge length of the tile in px.
    size: number;
}

// The settings window's logo (src/windows/styling/layout/FliqLogo.tsx): two small flip cards,
// green and white, on a dark tile.
export function FliqLogo({ size }: FliqLogoProps)
{
    const card = {
        width: Math.round(size / 3),
        height: Math.round(size * 0.45),
        borderRadius: Math.round(size / 16),
    };

    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: size / 4,
                gap: size / 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#121212",
                boxShadow: "0 30px 90px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.07)",
            }}
        >
            <span style={{ ...card, background: "#2fa84f" }} />
            <span style={{ ...card, background: "#fafafa" }} />
        </div>
    );
}
