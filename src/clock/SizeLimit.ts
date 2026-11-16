// What BlockContent measures to fit its content, at any font size (all sizes grow with it, so
// the ratios below do not depend on it). In px.
export interface FitMeasure
{
    // The content with and without its letter spacing.
    spacedWidth: number;
    unspacedWidth: number;
    // Height of the drawn content (plain text: its glyphs, see InkBounds).
    height: number;
    // The room inside the block's padding.
    areaWidth: number;
    areaHeight: number;
    // The block's row grows with its content (one row high; a row's height setting is only its
    // minimum): then the room's height is no limit, it follows the text size.
    heightFollows: boolean;
}

// The largest text size share (1 = 100 %) that still makes the content bigger. The content is
// fitted to the smallest of: the spaced width times the text size, the unspaced width (letter
// spacing never makes the font larger than the plain text allows) and, unless the row follows
// the block, the room's height. Above this share only the first one grows, so nothing changes.
export function maxSizeShare(measure: FitMeasure): number
{
    const textSizeFit = measure.areaWidth / measure.spacedWidth;
    let limit = measure.areaWidth / measure.unspacedWidth;
    if (!measure.heightFollows)
    {
        limit = Math.min(limit, measure.areaHeight / measure.height);
    }
    return limit / textSizeFit;
}
