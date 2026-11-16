import { StyledText } from "../../../../clock/StyledText";
import type { TextStyle } from "../../../../layout/ClockLayout";

// A small picture of `text` in a text style, for the style tiles. The real drawing (flip cards
// at rest, segments, dots, tubes), only plain text a little larger and lighter.
export function TextStylePreview({ style, text }: { style: TextStyle; text: string })
{
    if (style === "text")
    {
        return <span className="style-preview-text">{text}</span>;
    }
    return <StyledText text={text} style={style} iconStyle="colored" className="style-preview-styled" />;
}
