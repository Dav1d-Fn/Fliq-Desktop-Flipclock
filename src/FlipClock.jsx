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
      tick.value = {
        sep: ':',
        hours: d.getHours(),
        minutes: d.getMinutes(),
        seconds: d.getSeconds()
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
        <span data-key="hours" data-transform="pad(00)" data-view="flip"></span>
        <span className="tick-text-inline" data-view="text" data-key="sep"></span>
        <span data-key="minutes" data-transform="pad(00)" data-view="flip"></span>
        <span className="tick-text-inline" data-view="text" data-key="sep"></span>
        <span data-key="seconds" data-transform="pad(00)" data-view="flip"></span>
      </div>
    </div>
  );
}