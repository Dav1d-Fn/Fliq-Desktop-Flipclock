import { Easing, interpolate } from "remotion";

// The two curves of the whole film: a long ease-out for things arriving, a soft in-out for
// camera drifts and exits. No overshoot anywhere.
export const ARRIVE = Easing.bezier(0.16, 1, 0.3, 1);
export const DRIFT = Easing.bezier(0.45, 0, 0.55, 1);

// 0 → 1 over `length` frames from `start`, clamped.
export function progress(frame: number, start: number, length: number, easing = ARRIVE)
{
    return interpolate(frame, [start, start + length], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing,
    });
}

export function mix(from: number, to: number, amount: number)
{
    return from + (to - from) * amount;
}

// Opacity, blur and lift of an element that arrives at `start` and leaves at `end`.
export function reveal(frame: number, start: number, end: number, { arrive = 24, leave = 14, lift = 14, blur = 10 } = {})
{
    const inAmount = progress(frame, start, arrive);
    const outAmount = progress(frame, end - leave, leave, DRIFT);
    const visible = inAmount * (1 - outAmount);
    return {
        opacity: visible,
        filter: `blur(${(1 - inAmount) * blur + outAmount * blur * 0.6}px)`,
        translate: `0px ${(1 - inAmount) * lift - outAmount * lift * 0.4}px`,
    };
}
