import Tick from "@pqina/flip";
import "@pqina/flip/dist/flip.min.css";
import "./flipclockstyles.css";

import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { atom, useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import dayjs from 'dayjs';

const boxBackgroundColorAtom = atomWithStorage('boxBackgroundColor', '#1a1a1a00')
const boxRoundedAtom = atomWithStorage('boxRounded', 20)
const textColorAtom = atomWithStorage('textColor', '#ffffffff')
const seperationColorAtom = atomWithStorage('seperationColor', '#000000ff')
const flipCardBackgroundAtom = atomWithStorage('flipCardBackground', '#000000ff')
const flipcardRoundedAtom = atomWithStorage('flipcardRounded', 20)
//clockWidth is an integer with represents the width of the window
const clockWidthAtom = atomWithStorage('clockWidth', 100)
const clockPaddingAtom = atomWithStorage('clockPadding', 0)
const seperatorStringAtom = atomWithStorage("seperatorString"," /\\,.:")

export default function FlipClock({ format }) {   

  const [boxBackgroundColor, ] = useAtom(boxBackgroundColorAtom);
  const [boxRounded, setBoxRounded] = useAtom(boxRoundedAtom);
  const [textColor, setTextColor] = useAtom(textColorAtom);
  const [seperationColor, setSeperationColor] = useAtom(seperationColorAtom);
  const [flipCardBackground, setFlipCardBackground] = useAtom(flipCardBackgroundAtom);
  const [flipcardRounded, setFlipcardRounded] = useAtom(flipcardRoundedAtom);
  const [clockWidth, setClockWidth] = useAtom(clockWidthAtom);
  const [clockPadding, setClockPadding] = useAtom(clockPaddingAtom);
 const [seperatorString, setSeperatorString] = useAtom(seperatorStringAtom);

  const tickRef = useRef();
  const tickInstanceRef = useRef(null);

  function percentage_to_em_string(percentage) {
    return (percentage / 100).toString() + "em";
  }

  function percentage_px_string(percentage) {
    return percentage + "px";
  }

  function isSeparator(char) {
    //const separators = " /\\,.:";
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
         values["c"+i] = currentDateTimeString.charAt(i);
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
    <div style={{padding: percentage_px_string(clockPadding), backgroundColor: boxBackgroundColor, borderRadius: percentage_px_string(boxRounded)}}>
      <div style={{"--flipcard-bg-color": flipCardBackground, 
                    "--text-color": textColor, 
                    "--seperator-color": seperationColor,
                    "--flipcard-rounded": percentage_to_em_string(flipcardRounded)}} 
            ref={tickRef}
            data-credits="false"
            className="tick">
            <div id="flipclockdiv" data-layout="horizontal fit">
              {dayjs().format(format).split("").map((char, index) => (
                isSeparator(char) ?
                <span 
                  key={`span${index}`}
                  data-key={`c${index}`} 
                  className="tick-text-inline"
                  data-view="text"
                ></span> :
                <span 
                  key={`span${index}`}
                  data-key={`c${index}`}
                  data-transform="pad(0)"
                  data-view="flip"
                ></span>
              ))
              }
          </div>
      </div>
    </div>
  );
}