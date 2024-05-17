import Tick from "@pqina/flip";
import "@pqina/flip/dist/flip.min.css";
import "./flipclockstyles.css";

import React, { useEffect, useRef } from 'react';
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

const boxBackgroundColorAtom = atomWithStorage('boxBackgroundColor', '#1a1a1a00')
const boxRoundedAtom = atomWithStorage('boxRounded', 20)
const textColorAtom = atomWithStorage('textColor', '#ffffffff')
const seperationColorAtom = atomWithStorage('seperationColor', '#000000ff')
const flipCardBackgroundAtom = atomWithStorage('flipCardBackground', '#000000ff')
const flipcardRoundedAtom = atomWithStorage('flipcardRounded', 20)
//clockSize is an integer with represents the width of the window
const clockSizeAtom = atomWithStorage('clockSize', 100)
const clockPaddingAtom = atomWithStorage('clockPadding', 0)

export default function FlipClock() {

  const [boxBackgroundColor, ] = useAtom(boxBackgroundColorAtom);
  const [boxRounded, setBoxRounded] = useAtom(boxRoundedAtom);
  const [textColor, setTextColor] = useAtom(textColorAtom);
  const [seperationColor, setSeperationColor] = useAtom(seperationColorAtom);
  const [flipCardBackground, setFlipCardBackground] = useAtom(flipCardBackgroundAtom);
  const [flipcardRounded, setFlipcardRounded] = useAtom(flipcardRoundedAtom);
  const [clockSize, setClockSize] = useAtom(clockSizeAtom);
  const [clockPadding, setClockPadding] = useAtom(clockPaddingAtom);

  const tickRef = useRef();

  function percentage_to_em_string(percentage) {
    return (percentage / 100).toString() + "em";
  }

  function percentage_padding_to_vh_string (percentage) {
    return (percentage * 0.3 + 5).toString() + "vh";
  }

  function getWindowHeight() {
    var elem = document.getElementById('flipClockDiv')
    if(elem) {
      return elem.clientHeight+5;
    } else {
      return 100;
    }
  }

  function percentage_box_rounded_to_px_string(percentage) {
    return ((percentage / 100) * getWindowHeight()).toString() + "px";
  }

  function getClockWidthString() { 
    const calculatedWidth = clockSize - (2*clockMargin);
    return calculatedWidth.toString() + "px"; 
  }

  useEffect(() => {
    const tick = Tick.DOM.create(tickRef.current);

    // Start interval (default is 1 second) and update clock with current time
    const intervalId = Tick.helper.interval(() => {
      const d = Tick.helper.date();
      var hours = d.getHours().toString();
      var minutes = d.getMinutes().toString();
      var seconds = d.getSeconds().toString();
      if (hours.length === 1) hours = '0' + hours;
      if (minutes.length === 1) minutes = '0' + minutes;
      if (seconds.length === 1) seconds = '0' + seconds;

      tick.value = {
        sep: ':',
        hours0: parseInt(hours.charAt(0)),
        hours1: parseInt(hours.charAt(1)),
        minutes0: parseInt(minutes.charAt(0)),
        minutes1: parseInt(minutes.charAt(1)),
        seconds0: parseInt(seconds.charAt(0)),
        seconds1: parseInt(seconds.charAt(1))
      };
    });

    // Cleanup function
    return () => {
      Tick.DOM.destroy(tickRef.current);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div style={{padding: percentage_padding_to_vh_string(clockPadding), backgroundColor: boxBackgroundColor, borderRadius: percentage_box_rounded_to_px_string(boxRounded)}}>
      <div style={{"--flipcard-bg-color": flipCardBackground, 
                    "--text-color": textColor, 
                    "--seperator-color": seperationColor,
                    "--flipcard-rounded": percentage_to_em_string(flipcardRounded)}} 
            ref={tickRef} data-did-init="handleTickInit" 
            data-credits="false">
        <div id:flipClockDiv data-layout="horizontal fit">
          <span data-key="hours0" data-transform="pad(0)" data-view="flip"></span>
          <span data-key="hours1" data-transform="pad(0)" data-view="flip"></span>
          {/* <span data-key="sep" data-transform="pad(0)" data-view="flip"></span> */}
          <span className="tick-text-inline" data-view="text" data-key="sep"></span>
          <span data-key="minutes0" data-transform="pad(0)" data-view="flip"></span>
          <span data-key="minutes1" data-transform="pad(0)" data-view="flip"></span>
          {/* <span data-key="sep" data-transform="pad(0)" data-view="flip"></span> */}
          <span className="tick-text-inline" data-view="text" data-key="sep"></span>
          <span data-key="seconds0" data-transform="pad(0)" data-view="flip"></span>
          <span data-key="seconds1" data-transform="pad(0)" data-view="flip"></span>
        </div>

      </div>
    </div>
  );
}