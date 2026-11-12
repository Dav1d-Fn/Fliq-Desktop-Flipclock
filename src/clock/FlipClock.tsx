import Tick from "@pqina/flip";
import "@pqina/flip/dist/flip.min.css";
import "../styles/flipclockstyles.css";
import { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import dayjs from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/de";
import "dayjs/locale/fr";
import "dayjs/locale/es";
import "dayjs/locale/it";
import "dayjs/locale/ru";
import "dayjs/locale/zh";
import "dayjs/locale/ja";
import "dayjs/locale/sv";
import "dayjs/locale/pl";
import { ATOMS } from "../settings/atoms";
import { ClockTemplate } from "./ClockTemplate";
import { TimeCharacters } from "./TimeCharacters";
import { WeatherFormatter } from "../weather/WeatherFormatter";

interface FlipClockProps
{
    // Called when a time string changed its length; the parent then remounts the clock.
    onLayoutChange: () => void;
}

const TEXT_SEGMENT_STYLE: CSSProperties = { whiteSpace: "pre", display: "inline-block", unicodeBidi: "plaintext" };
const WEATHER_SEGMENT_STYLE: CSSProperties = { whiteSpace: "pre", display: "inline-block" };

// The clock: one or two rows of Tick.js flip cards, text and weather.
//
// Mounted once per layout (see useClockLayoutKey). Style settings and weather data re-render it
// in place; the Tick.js spans inside are left alone (see TimeCharacters).
export default function FlipClock({ onLayoutChange }: FlipClockProps)
{
    const format = useAtomValue(ATOMS.TIME_FORMAT);
    const secondRowFormat = useAtomValue(ATOMS.SECOND_ROW_TIME_FORMAT);
    const separatorString = useAtomValue(ATOMS.SEPARATOR_STRING);
    const language = useAtomValue(ATOMS.LANGUAGE);
    const secondRowEnabled = useAtomValue(ATOMS.SECOND_ROW_ENABLED);

    const boxBackgroundColor = useAtomValue(ATOMS.BOX_BACKGROUND);
    const boxRadius = useAtomValue(ATOMS.BOX_RADIUS);
    const flipcardBackground = useAtomValue(ATOMS.FLIPCARD_BACKGROUND);
    const flipcardRadius = useAtomValue(ATOMS.FLIPCARD_RADIUS);
    const clockTextColor = useAtomValue(ATOMS.CLOCK_TEXT_COLOR);
    const clockTextSize = useAtomValue(ATOMS.CLOCK_TEXT_SIZE);
    const clockSeparatorColor = useAtomValue(ATOMS.CLOCK_SEPARATOR_COLOR);
    const clockPadding = useAtomValue(ATOMS.CLOCK_PADDING);
    const secondRowTextSize = useAtomValue(ATOMS.SECOND_ROW_CLOCK_TEXT_SIZE);
    const secondRowGap = useAtomValue(ATOMS.SECOND_ROW_GAP);
    const textFont = useAtomValue(ATOMS.TEXT_FONT);
    const textColor = useAtomValue(ATOMS.TEXT_COLOR);

    const weatherReport = useAtomValue(ATOMS.WEATHER_REPORT);
    const sunDays = useAtomValue(ATOMS.SUN_DAYS);
    const weatherUnit = useAtomValue(ATOMS.WEATHER_UNIT);

    // Before the first render of the time spans, they are formatted with it.
    dayjs.locale(language);

    const firstRow = useMemo(() => new ClockTemplate(format, "fliqWord"), [format]);
    const secondRow = useMemo(() => new ClockTemplate(secondRowFormat, "2ndRowFliqWord"), [secondRowFormat]);

    // Current minute, so weather text that depends on the time (next sun event, day/night
    // emoji) moves on without new weather data.
    const [currentMinute, setCurrentMinute] = useState(() => new Date());

    const tickRootRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const firstRowRef = useRef<HTMLDivElement>(null);
    const secondRowRef = useRef<HTMLDivElement>(null);
    const [boxMinSide, setBoxMinSide] = useState(0);
    const [flipRowMinSide, setFlipRowMinSide] = useState(0);

    // Tick.js and the once-per-second update.
    useEffect(() =>
    {
        const tick = Tick.DOM.create(tickRootRef.current);
        const renderedLayout = firstRow.layoutSignature() + "|" + secondRow.layoutSignature();

        // Own timer instead of Tick.helper.interval: that one pauses while document.hidden and
        // missed the wake-up after monitor sleep (frozen clock). Rescheduled before the update,
        // so an exception in one tick cannot end the loop; aligned to the full second.
        let timer = 0;
        let lastMinute = Math.floor(Date.now() / 60000);
        const update = () =>
        {
            timer = window.setTimeout(update, 1000 - (Date.now() % 1000));

            if (firstRow.layoutSignature() + "|" + secondRow.layoutSignature() !== renderedLayout)
            {
                onLayoutChange();
                return;
            }

            const values: Record<string, string> = {};
            firstRow.collectValues(values);
            secondRow.collectValues(values);
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
            Tick.DOM.destroy(tickRootRef.current);
        };
        // The clock is remounted for a new layout, so this runs once per mount on purpose.
    }, []);

    // Rounding is relative to the box and the flip row, so both are measured whenever their
    // size changes (text size, padding, weather text, fonts).
    useEffect(() =>
    {
        const measure = () =>
        {
            const container = containerRef.current?.getBoundingClientRect();
            if (container)
            {
                setBoxMinSide(Math.min(container.width, container.height));
            }
            // The flip card rounding has always been taken from the second row when it is shown.
            // That is what existing setups were tuned against, so it stays that way.
            const referenceRow = (secondRowRef.current ?? firstRowRef.current)?.getBoundingClientRect();
            if (referenceRow)
            {
                setFlipRowMinSide(Math.min(referenceRow.width, referenceRow.height));
            }
        };

        const observer = new ResizeObserver(measure);
        [containerRef.current, firstRowRef.current, secondRowRef.current].forEach((element) =>
        {
            if (element)
            {
                observer.observe(element);
            }
        });
        return () => observer.disconnect();
    }, []);

    const weatherFormatter = new WeatherFormatter(weatherReport, sunDays, weatherUnit, currentMinute);

    function renderRow(template: ClockTemplate): ReactNode[]
    {
        let timeSegmentIndex = 0;

        return template.segments.map((segment, segmentIndex) =>
        {
            switch (segment.type)
            {
                case "FLIPTIME":
                case "TIME":
                {
                    const keyPrefix = template.characterKeyPrefix(timeSegmentIndex);
                    timeSegmentIndex++;
                    return (
                        <TimeCharacters
                            key={`time-${segmentIndex}`}
                            format={segment.value}
                            keyPrefix={keyPrefix}
                            flip={segment.type === "FLIPTIME"}
                            separatorString={separatorString}
                        />
                    );
                }
                case "TEXT":
                    return (
                        <span className="normal-text-settings" key={`text-${segmentIndex}`} style={TEXT_SEGMENT_STYLE}>
                            {segment.value}
                        </span>
                    );
                case "WEATHER":
                    return (
                        <span className="normal-text-settings" key={`weather-${segmentIndex}`} style={WEATHER_SEGMENT_STYLE}>
                            {weatherFormatter.format(segment.value)}
                        </span>
                    );
            }
        });
    }

    const containerStyle = {
        padding: `${clockPadding}px`,
        backgroundColor: boxBackgroundColor,
        borderRadius: `${(boxRadius / 2) * boxMinSide / 100}px`,
        "--flipcard-bg-color": flipcardBackground,
        "--clock-text-color": clockTextColor,
        "--seperator-color": clockSeparatorColor,
        "--flipcard-rounded": `${(flipRowMinSide * (flipcardRadius / 100)) / 2}px`,
        "--clock-text-size": `${clockTextSize}px`,
        "--second-row-clock-text-size": `${secondRowTextSize}px`,
        "--text-color": textColor,
        "--text-font": textFont,
    } as CSSProperties;

    return (
        <div id="flipclock-container" ref={containerRef} style={containerStyle}>
            <div ref={tickRootRef} data-credits="false" className="tick">
                <div id="flipclock" ref={firstRowRef}>
                    {renderRow(firstRow)}
                </div>
                {secondRowEnabled && (
                    <div style={{ marginTop: secondRowGap }}>
                        <div id="flipclock-second-row" ref={secondRowRef}>
                            {renderRow(secondRow)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
