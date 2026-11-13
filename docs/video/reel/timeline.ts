// The showreel's shots on the beat grid of the music. "The Glide Path" runs at 120 BPM with its
// beats at 0.09 s + n × 0.5 s, a break at 14 s and the drop at 16.09 s. The reel starts the track
// at 10.1 s, so the drop lands at 6.0 s and every beat of the video falls on a multiple of 0.5 s;
// the track's next section starts at 32.1 s, on the outro (22 s).

export const FPS = 30;
export const BEAT = 15; // frames, 0.5 s
export const BAR = 4 * BEAT;

export const seconds = (value: number) => Math.round(value * FPS);

// A split-flap change takes this long; its flap lands at the end, on the beat.
export const FLIP = 12;
export const QUICK_FLIP = 8;

export const MUSIC_TRIM = seconds(10.1);
export const DROP = seconds(6);
export const TOTAL_FRAMES = seconds(26.5);

// Each shot: when its content is fully in (the beat its flap lands on) and how long it holds.
// The flap starts `FLIP` frames earlier, while the previous shot is still showing.
export interface ShotTime
{
    lands: number;
    until: number;
}

const shot = (lands: number, until: number): ShotTime => ({ lands: seconds(lands), until: seconds(until) });

export const SHOTS = {
    looks: [shot(0, 1), shot(1, 2), shot(2, 3), shot(3, 4), shot(4, 5)],
    hero: shot(5, 8),
    logo: shot(8, 10),
    layout: shot(10, 12),
    group: shot(12, 14),
    style: shot(14, 16),
    undo: shot(16, 18),
    data: shot(18, 20),
    quickLooks: [shot(20, 20.5), shot(20.5, 21), shot(21, 21.5), shot(21.5, 22)],
    outro: shot(22, 26.5),
};

// reel-clock.mp4: the top flaps fall from frame 91 and land on frame 98. Landing on the drop:
export const CLOCK_LANDS = 98;
