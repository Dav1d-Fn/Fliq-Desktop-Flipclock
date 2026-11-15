// Which segments light up for each character of the LCD text style (SegmentFace). Pure data,
// tested for coverage (tests/glyphs.test.ts).
//
// Seven segments: a top, then clockwise b c d e f, g the middle bar. Fourteen segments split
// the middle bar into g1 (left) and g2 (right) and add the diagonals h (top left), j (top
// right), k (bottom left), m (bottom right) and the middle verticals i (top) and l (bottom).

// Digits and the few signs seven segments can show. Kept for text without letters, so the
// clock looks like an alarm clock display.
export const SEVEN_SEGMENT_GLYPHS: Record<string, string[]> = {
    0: ["a", "b", "c", "d", "e", "f"],
    1: ["b", "c"],
    2: ["a", "b", "g", "e", "d"],
    3: ["a", "b", "g", "c", "d"],
    4: ["f", "g", "b", "c"],
    5: ["a", "f", "g", "c", "d"],
    6: ["a", "f", "g", "e", "d", "c"],
    7: ["a", "b", "c"],
    8: ["a", "b", "c", "d", "e", "f", "g"],
    9: ["a", "b", "c", "d", "f", "g"],
    "-": ["g"],
    "°": ["a", "b", "f", "g"],
    " ": [],
};

// Letters, digits and signs on fourteen segments, for text with letters.
export const FOURTEEN_SEGMENT_GLYPHS: Record<string, string[]> = {
    0: ["a", "b", "c", "d", "e", "f"],
    1: ["b", "c"],
    2: ["a", "b", "g1", "g2", "e", "d"],
    3: ["a", "b", "g1", "g2", "c", "d"],
    4: ["f", "g1", "g2", "b", "c"],
    5: ["a", "f", "g1", "g2", "c", "d"],
    6: ["a", "f", "g1", "g2", "e", "d", "c"],
    7: ["a", "b", "c"],
    8: ["a", "b", "c", "d", "e", "f", "g1", "g2"],
    9: ["a", "b", "c", "d", "f", "g1", "g2"],
    A: ["a", "b", "c", "e", "f", "g1", "g2"],
    B: ["a", "b", "c", "d", "g2", "i", "l"],
    C: ["a", "d", "e", "f"],
    D: ["a", "b", "c", "d", "i", "l"],
    E: ["a", "d", "e", "f", "g1"],
    F: ["a", "e", "f", "g1"],
    G: ["a", "c", "d", "e", "f", "g2"],
    H: ["b", "c", "e", "f", "g1", "g2"],
    I: ["a", "d", "i", "l"],
    J: ["b", "c", "d", "e"],
    K: ["e", "f", "g1", "j", "m"],
    L: ["d", "e", "f"],
    M: ["b", "c", "e", "f", "h", "j"],
    N: ["b", "c", "e", "f", "h", "m"],
    O: ["a", "b", "c", "d", "e", "f"],
    P: ["a", "b", "e", "f", "g1", "g2"],
    Q: ["a", "b", "c", "d", "e", "f", "m"],
    R: ["a", "b", "e", "f", "g1", "g2", "m"],
    S: ["a", "f", "g1", "g2", "c", "d"],
    T: ["a", "i", "l"],
    U: ["b", "c", "d", "e", "f"],
    V: ["e", "f", "k", "j"],
    W: ["b", "c", "e", "f", "k", "m"],
    X: ["h", "j", "k", "m"],
    Y: ["h", "j", "l"],
    Z: ["a", "d", "j", "k"],
    "-": ["g1", "g2"],
    "/": ["j", "k"],
    "°": ["a", "b", "f", "g1", "g2"],
    "%": ["c", "f", "j", "k"],
    "+": ["g1", "g2", "i", "l"],
    "=": ["g1", "g2", "d"],
    "(": ["j", "m"],
    ")": ["h", "k"],
    "'": ["j"],
    "?": ["a", "b", "g2", "l"],
    "!": ["b", "c"],
    "_": ["d"],
    " ": [],
};

// Drawn as narrow dots between the cells instead of segments.
export const SEGMENT_DOTS = [":", ".", ","];

// Text as the LCD can show it: upper case (ß becomes SS), accents and umlaut dots dropped,
// typographic dashes and ellipses as plain ones.
export function segmentText(text: string): string
{
    return text
        .toUpperCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/[–—]/g, "-")
        .replace(/…/g, "...");
}

// Seven segments when they can show every character, fourteen otherwise.
export function segmentGlyphs(text: string): Record<string, string[]>
{
    const sevenSegments = text.split("").every((character) => character in SEVEN_SEGMENT_GLYPHS || SEGMENT_DOTS.includes(character));
    return sevenSegments ? SEVEN_SEGMENT_GLYPHS : FOURTEEN_SEGMENT_GLYPHS;
}
