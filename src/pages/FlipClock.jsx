import Tick from "@pqina/flip";
import "@pqina/flip/dist/flip.min.css";
import "../styles/flipclockstyles.css";

import React, {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useState,
} from "react";
import { atom, useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import dayjs from "dayjs";

const boxBackgroundColorAtom = atomWithStorage(
  "boxBackgroundColor",
  "#121212ab"
);
const boxRoundedAtom = atomWithStorage("boxRounded", 20);
const textColorAtom = atomWithStorage("textColor", "#ffffffff");
const seperationColorAtom = atomWithStorage("seperationColor", "#ffffffff");
const flipCardBackgroundAtom = atomWithStorage(
  "flipCardBackground",
  "#1c1c1cff"
);
const flipcardRoundedAtom = atomWithStorage("flipcardRounded", 20);
const clockWidthAtom = atomWithStorage("clockWidth", 20);
const clockPaddingAtom = atomWithStorage("clockPadding", 20);
const seperatorStringAtom = atomWithStorage("seperatorString", " /\\,.:");

export default function FlipClock({ format }) {
  const [boxBackgroundColor] = useAtom(boxBackgroundColorAtom);
  const [boxRounded, setBoxRounded] = useAtom(boxRoundedAtom);
  const [textColor, setTextColor] = useAtom(textColorAtom);
  const [seperationColor, setSeperationColor] = useAtom(seperationColorAtom);
  const [flipCardBackground, setFlipCardBackground] = useAtom(
    flipCardBackgroundAtom
  );
  const [flipcardRounded, setFlipcardRounded] = useAtom(flipcardRoundedAtom);
  const [clockWidth, setClockWidth] = useAtom(clockWidthAtom);
  const [clockPadding, setClockPadding] = useAtom(clockPaddingAtom);
  const [seperatorString, setSeperatorString] = useAtom(seperatorStringAtom);

  const tickRef = useRef();
  const tickInstanceRef = useRef(null);

  function percentage_to_em_string(percentage) {
    return (percentage / 100).toString() + "em";
  }

  function value_px_string(value) {
    return value + "px";
  }

  // Function to check if character is a separator,
  // to determine if it should be displayed as a flip or text
  function isSeparator(char) {
    return seperatorString.includes(char);
  }

  useEffect(() => {
    const tick = Tick.DOM.create(tickRef.current);
    Tick.DOM.parse(document.body);
    // Start interval (default is 1 second) and update clock with current time
    const intervalId = Tick.helper.interval(() => {
      const currentDateTimeString = dayjs().format(format);
      // Function to generate keys for each character
      const values = {};
      for (let i = 0; i < currentDateTimeString.length; i++) {
        values["c" + i] = currentDateTimeString.charAt(i);
      }

      tick.value = values;
    });

    // Cleanup function
    return () => {
      Tick.DOM.destroy(tickRef.current);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div
      id="flipclockdivwithpadding"
      style={{
        padding: value_px_string(clockPadding),
        backgroundColor: boxBackgroundColor,
        borderRadius: value_px_string(boxRounded),
        // "border-color": "red",
        // "border-style": "solid"
      }}
    >
      <div
        style={{
          "--flipcard-bg-color": flipCardBackground,
          "--text-color": textColor,
          "--seperator-color": seperationColor,
          "--flipcard-rounded": percentage_to_em_string(flipcardRounded),
          // "border-color": "red",
          // "border-style": "solid"
        }}
        ref={tickRef}
        data-credits="false"
        className="tick"
      >
        <div id="flipclockdiv" data-layout="horizontal fit">
          {dayjs()
            .format(format)
            .split("")
            .map((char, index) =>
              isSeparator(char) ? (
                <span
                  key={`span${index}`}
                  data-key={`c${index}`}
                  className="tick-text-inline"
                  data-view="text"
                ></span>
              ) : (
                <span
                  key={`span${index}`}
                  data-key={`c${index}`}
                  data-transform="pad(0)"
                  //data-style="font:highres"
                  data-view="flip"
                ></span>
              )
            )}
        </div>
      </div>
    </div>
  );
}
