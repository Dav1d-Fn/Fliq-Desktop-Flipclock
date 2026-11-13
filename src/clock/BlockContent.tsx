import Tick from "@pqina/flip";
import "@pqina/flip/dist/flip.min.css";
import "../styles/flipclockstyles.css";
import { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { ATOMS } from "../settings/atoms";
import { ClockTemplate, type Segment } from "./ClockTemplate";
import { TimeCharacters } from "./TimeCharacters";
import { WeatherFormatter } from "../weather/WeatherFormatter";

interface BlockContentProps
{
    segments: Segment[];
    justify: CSSProperties["justifyContent"];
    // Share of the room the content fills (block text size setting), 1 = all of it.
    sizeShare: number;
    // Called when a time string changed its length; the block is then remounted.
    onLayoutChange: () => void;
}

// Letter spacing comes from flipclockstyles.css, the same for text runs and time characters.
const SEGMENT_STYLE: CSSProperties = { whiteSpace: "pre", display: "inline-block", unicodeBidi: "plaintext" };

// Share of the block height the content may fill. Flip cards fill the block; plain text stays
// smaller, its line box has room above and below the letters anyway.
const FLIP_HEIGHT_SHARE = 1;
const TEXT_HEIGHT_SHARE = 0.62;

const MIN_FONT_SIZE = 4;
const FIT_TOLERANCE = 0.01;

// What one block shows: Tick.js flip cards, time, text and weather, scaled to fill the block.
//
// Mounted once per segment list (see ClockBlock). Weather data and style changes re-render it in
// place; the Tick.js spans inside are left alone (see TimeCharacters).
export function BlockContent({ segments, justify, sizeShare, onLayoutChange }: BlockContentProps)
{
    const weatherReport = useAtomValue(ATOMS.WEATHER_REPORT);
    const sunDays = useAtomValue(ATOMS.SUN_DAYS);
    const weatherUnit = useAtomValue(ATOMS.WEATHER_UNIT);

    const template = useMemo(() => new ClockTemplate(segments), [segments]);

    // Current minute, so weather text that depends on the time (next sun event, day/night
    // emoji) moves on without new weather data.
    const [currentMinute, setCurrentMinute] = useState(() => new Date());

    const areaRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Tick.js and the once-per-second update.
    useEffect(() =>
    {
        const root = contentRef.current;
        const tick = Tick.DOM.create(root);
        const renderedLayout = template.layoutSignature();

        // Own timer instead of Tick.helper.interval: that one pauses while document.hidden and
        // missed the wake-up after monitor sleep (frozen clock). Rescheduled before the update,
        // so an exception in one tick cannot end the loop; aligned to the full second.
        let timer = 0;
        let lastMinute = Math.floor(Date.now() / 60000);
        const update = () =>
        {
            timer = window.setTimeout(update, 1000 - (Date.now() % 1000));

            if (template.layoutSignature() !== renderedLayout)
            {
                onLayoutChange();
                return;
            }

            const values: Record<string, string> = {};
            template.collectValues(values);
            tick.value = values;

            const minute = Math.floor(Date.now() / 60000);
            if (minute !== lastMinute)
            {
                lastMinute = minute;
                setCurrentMinute(new Date());
            }
        };
        timer = window.setTimeout(update, 0);

        return () =>
        {
            window.clearTimeout(timer);
            Tick.DOM.destroy(root);
        };
        // The block is remounted for new segments, so this runs once per mount on purpose.
    }, []);

    // Font size that makes the content fill the block: content size scales linearly with the
    // font size, so one ratio step lands on it. Runs again when the block (resize) or the
    // content (weather text, fonts, Tick.js) changes size.
    //
    // Measured with fractions (getBoundingClientRect, not offsetWidth) and changes under 1 %
    // ignored: with whole pixels the height kept flipping between two values, and the text
    // grew and shrank every frame.
    useEffect(() =>
    {
        const area = areaRef.current;
        const content = contentRef.current;
        if (!area || !content)
        {
            return;
        }
        const heightShare = template.hasFlipTime() ? FLIP_HEIGHT_SHARE : TEXT_HEIGHT_SHARE;
        let fontSize = 20;

        // Ratio that makes a measured content size fill the given share of the room's height
        // (and all of its width).
        const fill = (natural: DOMRect, available: DOMRect, share: number) =>
            Math.min(available.width / natural.width, available.height * share / natural.height);

        // The font size comes from the content without letter spacing (times the block's text
        // size); the spacing then uses the free room and shrinks the font only when the spaced
        // content no longer fits. Measured twice in one go, the observer sees no change.
        const fit = () =>
        {
            const available = area.getBoundingClientRect();
            content.style.setProperty("--letter-spacing", "0em");
            const unspaced = content.getBoundingClientRect();
            content.style.removeProperty("--letter-spacing");
            const spaced = content.getBoundingClientRect();
            if (unspaced.width === 0 || unspaced.height === 0 || available.width === 0)
            {
                return;
            }
            // 100 % is the usual fit; the text size scales it either way. Above 100 % the content
            // may grow past the block's edges on purpose (the user's call, like an offset).
            const ratio = sizeShare * Math.min(fill(unspaced, available, heightShare), fill(spaced, available, 1));
            if (Math.abs(ratio - 1) < FIT_TOLERANCE)
            {
                return;
            }
            fontSize = Math.max(MIN_FONT_SIZE, fontSize * ratio);
            content.style.fontSize = `${fontSize}px`;
        };

        content.style.fontSize = `${fontSize}px`;
        const observer = new ResizeObserver(fit);
        observer.observe(area);
        observer.observe(content);
        return () => observer.disconnect();
    }, [template, sizeShare]);

    const weatherFormatter = new WeatherFormatter(weatherReport, sunDays, weatherUnit, currentMinute);

    function renderSegments(): ReactNode[]
    {
        let timeSegmentIndex = 0;

        return template.segments.map((segment, segmentIndex) =>
        {
            switch (segment.type)
            {
                case "FLIPTIME":
                case "TIME":
                {
                    const keyPrefix = ClockTemplate.characterKeyPrefix(timeSegmentIndex);
                    timeSegmentIndex++;
                    return (
                        <TimeCharacters
                            key={`time-${segmentIndex}`}
                            format={segment.value}
                            keyPrefix={keyPrefix}
                            flip={segment.type === "FLIPTIME"}
                            member={segment.member}
                        />
                    );
                }
                case "TEXT":
                    return (
                        <span className="normal-text-settings text-run" key={`text-${segmentIndex}`} data-member={segment.member} style={SEGMENT_STYLE}>
                            {segment.value}
                        </span>
                    );
                case "WEATHER":
                    return (
                        <span className="normal-text-settings text-run" key={`weather-${segmentIndex}`} data-member={segment.member} style={SEGMENT_STYLE}>
                            {weatherFormatter.format(segment.value)}
                        </span>
                    );
                case "SPACE":
                    return <span className="segment-space" key={`space-${segmentIndex}`} style={{ display: "inline-block", width: `${segment.value}em` }} />;
            }
        });
    }

    return (
        <div className="clock-block-fit" ref={areaRef} style={{ justifyContent: justify }}>
            <div className="tick block-content" ref={contentRef} data-credits="false">
                {renderSegments()}
            </div>
        </div>
    );
}
