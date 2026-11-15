import Tick from "@pqina/flip";
import "@pqina/flip/dist/flip.min.css";
import "../styles/flipclockstyles.css";
import { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { ATOMS } from "../settings/atoms";
import { ClockTemplate, type Segment } from "./ClockTemplate";
import { ClockFace } from "./faces/ClockFace";
import { progressShare } from "./ProgressShare";
import { maxSizeShare } from "./SizeLimit";
import { TimeCharacters } from "./TimeCharacters";
import type { IconStyle } from "../layout/ClockLayout";
import { withFlatIcons } from "../weather/FlatWeatherIcons";
import { WeatherFormatter } from "../weather/WeatherFormatter";

interface BlockContentProps
{
    segments: Segment[];
    justify: CSSProperties["justifyContent"];
    // Where the content sits when the block is higher than it needs (the row's alignment).
    alignItems: CSSProperties["alignItems"];
    // Share of the room the content fills (block text size setting), 1 = all of it.
    sizeShare: number;
    // The block's row grows with its content (see FitMeasure.heightFollows).
    heightFollows: boolean;
    iconStyle: IconStyle;
    // Called when a time string changed its length; the block is then remounted.
    onLayoutChange: () => void;
    // Content height per px of content width at which it fills the block exactly; the row
    // height comes from it (see ClockBlock). Also the largest size share that still makes the
    // content bigger (see maxSizeShare). Not called for the progress bar.
    onMeasure: (heightPerWidth: number, maxShare: number) => void;
}

// Letter spacing comes from flipclockstyles.css, the same for text runs and time characters.
const SEGMENT_STYLE: CSSProperties = { whiteSpace: "pre", display: "inline-block", unicodeBidi: "plaintext" };

// Share of the block height the content may fill. Flip cards and faces fill the block; plain text stays
// smaller, its line box has room above and below the letters anyway.
const FLIP_HEIGHT_SHARE = 1;
const TEXT_HEIGHT_SHARE = 0.62;

const MIN_FONT_SIZE = 4;
const FIT_TOLERANCE = 0.01;

// What one block shows: Tick.js flip cards, time, text and weather, scaled to fill the block.
//
// Mounted once per segment list (see ClockBlock). Weather data and style changes re-render it in
// place; the Tick.js spans inside are left alone (see TimeCharacters).
export function BlockContent({ segments, justify, alignItems, sizeShare, heightFollows, iconStyle, onLayoutChange, onMeasure }: BlockContentProps)
{
    const weatherReport = useAtomValue(ATOMS.WEATHER_REPORT);
    const sunDays = useAtomValue(ATOMS.SUN_DAYS);
    const weatherUnit = useAtomValue(ATOMS.WEATHER_UNIT);

    const template = useMemo(() => new ClockTemplate(segments), [segments]);
    const stacked = segments.some((segment) => segment.type === "BREAK");

    // Current minute, so weather text that depends on the time (next sun event, day/night
    // emoji) moves on without new weather data.
    const [currentMinute, setCurrentMinute] = useState(() => new Date());

    const areaRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const barFillRef = useRef<HTMLDivElement>(null);

    // Tick.js and the once-per-second update.
    useEffect(() =>
    {
        // A progress bar block has no Tick.js content, only the bar.
        const root = contentRef.current;
        const tick = root ? Tick.DOM.create(root) : null;
        const renderedLayout = template.layoutSignature();

        // Own timer instead of Tick.helper.interval: that one pauses while document.hidden and
        // missed the wake-up after monitor sleep (frozen clock). Rescheduled before the update,
        // so an exception in one tick cannot end the loop; aligned to the full second.
        let timer = 0;
        let lastMinute = Math.floor(Date.now() / 60000);
        let lastBarShare = Infinity;
        const update = () =>
        {
            timer = window.setTimeout(update, 1000 - (Date.now() % 1000));

            if (template.layoutSignature() !== renderedLayout)
            {
                onLayoutChange();
                return;
            }

            if (tick)
            {
                const values: Record<string, string> = {};
                template.collectValues(values);
                tick.value = values;
            }
            updateProgressBar();

            const minute = Math.floor(Date.now() / 60000);
            if (minute !== lastMinute)
            {
                lastMinute = minute;
                setCurrentMinute(new Date());
            }
        };
        // Smooth: slides over the coming second (CSS transition) to where it is then; stepped:
        // jumps without one. Full at the end of the unit, then back to one step: the jump back
        // is drawn without a transition, never sliding backwards.
        const progressBar = template.progressBar();
        const updateProgressBar = () =>
        {
            const fill = barFillRef.current;
            if (!fill || !progressBar)
            {
                return;
            }
            const motion = progressBar.motion ?? "smooth";
            const share = progressShare(new Date(), progressBar.unit ?? "minute", motion);
            fill.style.transition = motion === "stepped" || share < lastBarShare ? "none" : "";
            fill.style.width = `${share * 100}%`;
            lastBarShare = share;
        };

        timer = window.setTimeout(update, 0);

        return () =>
        {
            window.clearTimeout(timer);
            if (root)
            {
                Tick.DOM.destroy(root);
            }
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
        const heightShare = template.fillsHeight() ? FLIP_HEIGHT_SHARE : TEXT_HEIGHT_SHARE;
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
            // Height at which neither the height nor the width limits the fit (letter spacing
            // only widens), per px of width. Font size cancels out, so this stays put.
            const maxShare = maxSizeShare({
                spacedWidth: spaced.width,
                unspacedWidth: unspaced.width,
                unspacedHeight: unspaced.height,
                areaWidth: available.width,
                areaHeight: available.height,
                heightShare,
                heightFollows,
            });
            onMeasure(unspaced.height / heightShare / spaced.width, maxShare);
            // The text size scales the width fit only: the row height already follows it (see
            // ClockBlock), scaling the height fit too would shrink the content twice.
            // Where the height limits (row set by hand, block over several rows), the text size
            // only shrinks below maxShare; the inspector's slider ends there.
            const ratio = Math.min(sizeShare * available.width / spaced.width, fill(unspaced, available, heightShare));
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
    }, [template, sizeShare, heightFollows]);

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
                case "FACE":
                    return (
                        <ClockFace
                            key={`face-${segmentIndex}`}
                            style={segment.face ?? "segment"}
                            format={segment.value}
                            unit={segment.unit}
                            motion={segment.motion}
                            member={segment.member}
                        />
                    );
                case "TEXT":
                    return (
                        <span className="normal-text-settings text-run" key={`text-${segmentIndex}`} data-member={segment.member} style={SEGMENT_STYLE}>
                            {segment.value}
                        </span>
                    );
                case "WEATHER":
                {
                    const weatherText = weatherFormatter.format(segment.value);
                    return (
                        <span className="normal-text-settings text-run" key={`weather-${segmentIndex}`} data-member={segment.member} style={SEGMENT_STYLE}>
                            {iconStyle === "flat" ? withFlatIcons(weatherText) : weatherText}
                        </span>
                    );
                }
                case "SPACE":
                    return <span className="segment-space" key={`space-${segmentIndex}`} style={{ display: "inline-block", width: `${segment.value}em` }} />;
            }
        });
    }

    // A stacked group: one line per member, each BREAK starts the next one after its room.
    function renderLines(): ReactNode[]
    {
        const nodes = renderSegments();
        const lines: { room: string; nodes: ReactNode[] }[] = [{ room: "0", nodes: [] }];
        template.segments.forEach((segment, segmentIndex) =>
        {
            if (segment.type === "BREAK")
            {
                lines.push({ room: segment.value, nodes: [] });
            }
            else
            {
                lines[lines.length - 1].nodes.push(nodes[segmentIndex]);
            }
        });
        return lines.map((line, lineIndex) => (
            <div className="block-content" key={`line-${lineIndex}`} style={{ marginTop: `${line.room}em` }}>
                {line.nodes}
            </div>
        ));
    }

    if (template.progressBar())
    {
        return (
            <div className="clock-block-fit" ref={areaRef} style={{ alignItems }}>
                <div className="seconds-bar">
                    <div className="seconds-bar-fill" ref={barFillRef} />
                </div>
            </div>
        );
    }

    return (
        <div className="clock-block-fit" ref={areaRef} style={{ justifyContent: justify, alignItems }}>
            {stacked
                ? (
                    <div className="tick block-content stacked" ref={contentRef} data-credits="false" style={{ alignItems: justify }}>
                        {renderLines()}
                    </div>
                )
                : (
                    <div className="tick block-content" ref={contentRef} data-credits="false">
                        {renderSegments()}
                    </div>
                )}
        </div>
    );
}
