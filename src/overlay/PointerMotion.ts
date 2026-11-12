interface PointerSample
{
    x: number;
    y: number;
    time: number;
}

// Where the pointer is at the moment a frame is drawn.
//
// WebKitGTK delivers pointer moves in bunches: about every fifth frame gets none at all, and the
// clock would stand still for that frame. This keeps the recent samples and continues the
// movement from the last one at the speed of the last few dozen milliseconds. The guess is
// short, so a stop or turn is at most a few pixels off for a single frame.
export class PointerMotion
{
    // Window for the speed; long enough to smooth whole-pixel steps, short enough to follow turns.
    private static readonly VELOCITY_WINDOW_MS = 40;
    // Never guess further ahead than about one frame.
    private static readonly MAX_LOOKAHEAD_MS = 20;
    // A pointer that sent nothing for this long has stopped; no guessing then.
    private static readonly STOPPED_AFTER_MS = 50;

    private readonly samples: PointerSample[] = [];

    // `time` must be on the clock of performance.now(), like PointerEvent.timeStamp.
    record(x: number, y: number, time: number): void
    {
        this.samples.push({ x, y, time });

        const oldestKept = time - PointerMotion.VELOCITY_WINDOW_MS;
        while (this.samples.length > 2 && this.samples[0].time < oldestKept)
        {
            this.samples.shift();
        }
    }

    // Estimated position at `frameTime` (the requestAnimationFrame timestamp). `null` before the
    // first sample.
    positionAt(frameTime: number): { x: number; y: number } | null
    {
        const last = this.samples[this.samples.length - 1];
        if (!last)
        {
            return null;
        }

        const first = this.samples[0];
        const sinceLast = frameTime - last.time;
        const sampledSpan = last.time - first.time;
        if (sampledSpan <= 0 || sinceLast <= 0 || sinceLast > PointerMotion.STOPPED_AFTER_MS)
        {
            return { x: last.x, y: last.y };
        }

        const lookahead = Math.min(sinceLast, PointerMotion.MAX_LOOKAHEAD_MS);
        const velocityX = (last.x - first.x) / sampledSpan;
        const velocityY = (last.y - first.y) / sampledSpan;
        return {
            x: last.x + velocityX * lookahead,
            y: last.y + velocityY * lookahead,
        };
    }
}
