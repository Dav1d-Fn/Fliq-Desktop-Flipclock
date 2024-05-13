import Tick from "@pqina/flip";
import "@pqina/flip/dist/flip.min.css";
import React, { useEffect, useRef, useState } from 'react';

export default function Flip({value}) {
  const tickRef = React.useRef();
  let tickInstance = React.useRef()

  useEffect(()=>{
    tickInstance.current = Tick.DOM.create(tickRef.current, {
      value
    });

    return () =>  Tick.DOM.destroy(tickRef.current);
  },[])

  useEffect(()=>{
    if (!tickInstance.current) return;
    tickInstance.current.value = value;
  },[value])

  return (
    <div ref={tickRef} className="tick">
    <div data-repeat="true" aria-hidden="true">
      <span data-view="flip">Tick</span>
    </div>
  </div>
  )
}