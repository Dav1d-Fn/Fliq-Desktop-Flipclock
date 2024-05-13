import Tick from "@pqina/flip";
import "@pqina/flip/dist/flip.min.css";
import "./flipclockstyles.css";
import React, { useEffect, useRef } from 'react';

export default function FlipClock() {
  const tickRef = useRef();

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
    <div className="tick" ref={tickRef} data-did-init="handleTickInit" data-credits="false">
      <div data-layout="horizontal fit">
        <span data-key="hours0" data-transform="pad(0)" data-view="flip"></span>
        <span data-key="hours1" data-transform="pad(0)" data-view="flip"></span>
        <span className="tick-text-inline" data-view="text" data-key="sep"></span>
        <span data-key="minutes0" data-transform="pad(0)" data-view="flip"></span>
        <span data-key="minutes1" data-transform="pad(0)" data-view="flip"></span>
        <span className="tick-text-inline" data-view="text" data-key="sep"></span>
        <span data-key="seconds0" data-transform="pad(0)" data-view="flip"></span>
        <span data-key="seconds1" data-transform="pad(0)" data-view="flip"></span>
      </div>
    </div>
  );
}