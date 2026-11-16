// Where the visible glyphs of plain text are, as opposed to its line boxes: the letters of a
// line box leave room above (accents, line height) and below (descenders) that is never drawn.
// BlockContent trims that room so plain text touches its block's edge like flip cards do.
//
// The DOM only knows line boxes, so each text node is measured on a canvas in its own font
// (actualBoundingBox: the drawn pixels of that very string, emoji included) and placed on the
// baseline of its line box.

interface GlyphMetrics
{
    // From the baseline up to the font's ascent and down to its descent (the line box's content area).
    fontAscent: number;
    fontDescent: number;
    // From the baseline up to the highest drawn pixel and down to the lowest.
    inkAscent: number;
    inkDescent: number;
}

// Room of a content element's box that no glyph reaches, in px.
export interface InkTrim
{
    top: number;
    bottom: number;
}

// ponytail: unbounded growth is capped by clearing; text changes once a minute at most.
const CACHE_LIMIT = 500;

export class InkBounds
{
    private static context: CanvasRenderingContext2D | null = null;
    private static readonly cache = new Map<string, GlyphMetrics>();
    private static listening = false;

    // Room above the highest and below the lowest glyph of everything drawn inside the content.
    // Icons (svg, img) count with their box. Zero when nothing is measurable.
    static trim(content: HTMLElement): InkTrim
    {
        const box = content.getBoundingClientRect();
        let inkTop = Infinity;
        let inkBottom = -Infinity;

        const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        for (let node = walker.nextNode(); node !== null; node = walker.nextNode())
        {
            const text = node.textContent ?? "";
            const element = node.parentElement;
            if (text.trim() === "" || element === null)
            {
                continue;
            }
            const style = getComputedStyle(element);
            if (style.visibility === "hidden")
            {
                continue;
            }
            const metrics = InkBounds.metrics(InkBounds.font(style), text);
            if (metrics === null)
            {
                continue;
            }
            range.selectNodeContents(node);
            for (const rect of range.getClientRects())
            {
                // The rect is the font's content area; centred on it, so rounding of its height
                // splits evenly.
                const baseline = rect.top + (rect.height - metrics.fontAscent - metrics.fontDescent) / 2 + metrics.fontAscent;
                inkTop = Math.min(inkTop, baseline - metrics.inkAscent);
                inkBottom = Math.max(inkBottom, baseline + metrics.inkDescent);
            }
        }
        for (const icon of content.querySelectorAll("svg, img"))
        {
            const rect = icon.getBoundingClientRect();
            if (rect.height > 0)
            {
                inkTop = Math.min(inkTop, rect.top);
                inkBottom = Math.max(inkBottom, rect.bottom);
            }
        }

        if (inkTop === Infinity)
        {
            return { top: 0, bottom: 0 };
        }
        return {
            top: Math.max(0, inkTop - box.top),
            bottom: Math.max(0, box.bottom - inkBottom),
        };
    }

    private static font(style: CSSStyleDeclaration): string
    {
        return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    }

    private static metrics(font: string, text: string): GlyphMetrics | null
    {
        const key = `${font}|${text}`;
        const known = InkBounds.cache.get(key);
        if (known)
        {
            return known;
        }
        const context = InkBounds.canvas();
        if (context === null)
        {
            return null;
        }
        context.font = font;
        const measured = context.measureText(text);
        const metrics = {
            fontAscent: measured.fontBoundingBoxAscent,
            fontDescent: measured.fontBoundingBoxDescent,
            inkAscent: measured.actualBoundingBoxAscent,
            inkDescent: measured.actualBoundingBoxDescent,
        };
        if (InkBounds.cache.size >= CACHE_LIMIT)
        {
            InkBounds.cache.clear();
        }
        InkBounds.cache.set(key, metrics);
        return metrics;
    }

    private static canvas(): CanvasRenderingContext2D | null
    {
        if (InkBounds.context === null)
        {
            InkBounds.context = document.createElement("canvas").getContext("2d");
        }
        // Text measured before a web font arrived was measured in the fallback font.
        if (!InkBounds.listening && document.fonts)
        {
            InkBounds.listening = true;
            document.fonts.addEventListener("loadingdone", () => InkBounds.cache.clear());
        }
        return InkBounds.context;
    }
}
