import React, { useRef, useEffect, useState } from "react";
import Tick from "@pqina/flip";
import "@pqina/flip/dist/flip.min.css";
import "./flipclockstyles.css";
import dayjs from "dayjs"; // Import dayjs

export default function FlipClockneww({ format }) {
  const divRef = useRef();
  const tickRef = useRef();

  const [tickValue, setTickValue] = useState(dayjs().format(format));

  // Make the Tick instance and store it in the refs
  useEffect(() => {

    const didInit = (tick) => {
      tickRef.current = tick;
    };

    const currDiv = divRef.current;

    const currentDateTimeString = dayjs().format(format);
    const values = {};

    for (let i = 0; i < currentDateTimeString.length; i++) {
      values["c" + i] = currentDateTimeString.charAt(i);
    }

    const tick = Tick.DOM.create(currDiv, {
      value: values,
      didInit
    });

    return () => Tick.DOM.destroy(tickRef.current); // Cleanup properly
    
  }, [format]);

  // Start the Tick.down process
  useEffect(() => {

    const intervalId = Tick.helper.interval(() => {

      setTickValue(dayjs().format(format));

    }, 1000); // Assuming you want to update every second

    return () => {
      clearInterval(intervalId); // Cleanup properly
    };

  }, [format]);

  // When the tickValue is updated, update the Tick.DOM element
  useEffect(() => {

    const values = {};
    const currentDateTimeString = dayjs().format(format);

    for (let i = 0; i < currentDateTimeString.length; i++) {
      values["c" + i] = currentDateTimeString.charAt(i);
    }

    if (tickRef.current) {
      tickRef.current.value = values;
    }

  }, [tickValue]); // Add format to dependencies

  return (
    <div className="tick">
      <div data-repeat="true" data-layout="horizontal fit">
        <div className="tick-group" style={{ fontSize: 24 }}>
          <div ref={divRef} style={{ display: "flex" }}>
            {tickValue.split("").map((char, index) => (
              <span
                key={`span${index}`}
                data-key={`c${index}`}
                data-transform="pad(0)"
                data-view="flip"
              >
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}