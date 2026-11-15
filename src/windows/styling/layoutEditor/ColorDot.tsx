interface ColorDotProps
{
    color: string;
}

// A small filled circle in a color, for section summaries.
export function ColorDot({ color }: ColorDotProps)
{
    return <span className="color-dot" style={{ background: color }} aria-hidden="true" />;
}
