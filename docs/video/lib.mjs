// Shared pieces for the recording scripts: a browser on the Vite dev server with seeded
// settings, a fake mouse cursor (headless Chromium draws none) and a frame recorder.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const DEV_SERVER = process.env.DEV_SERVER ?? "http://localhost:1420";
export const OUT = new URL("./out/", import.meta.url).pathname;

// A Friday morning, a few seconds before the full hour, so the flip cards have something to do.
export const START_TIME = new Date(2026, 10, 13, 9, 59, 54);

function dayKey(date)
{
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

function sunDay(date)
{
    const at = (hours, minutes) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes).getTime();
    return { date: dayKey(date), sunrise: at(7, 48), sunset: at(16, 51) };
}

// Weather values written straight into the cache keys, so nothing is downloaded.
export const WEATHER_SEED = {
    weatherReport: {
        temperatureCelsius: "12",
        temperatureFahrenheit: "54",
        feelsLikeCelsius: "10",
        feelsLikeFahrenheit: "50",
        highCelsius: "14",
        highFahrenheit: "57",
        lowCelsius: "6",
        lowFahrenheit: "43",
        descriptionEnglish: "Partly cloudy",
        descriptionLocalized: "Partly cloudy",
        latitude: "0",
        longitude: "0",
    },
    sunDays: {
        latitude: "0",
        longitude: "0",
        days: [sunDay(START_TIME), sunDay(new Date(START_TIME.getTime() + 86400000))],
    },
};

// The default layout with a seconds flip on top: something moves in every shot.
export const DEMO_LAYOUT = {
    columns: 4,
    rows: 2,
    columnGap: 0,
    rowGap: 0,
    rowHeights: [65, 35],
    blocks: [
        { id: 1, kind: "flip", x: 0, y: 0, w: 4, h: 1, display: "HH:mm", cardColor: "#212121ff", padding: 0, letterSpacing: -0.03, textSize: 99 },
        {
            id: 2,
            kind: "group",
            x: 0,
            y: 1,
            w: 4,
            h: 1,
            display: "group",
            items: [
                { kind: "date", display: "ddd, DD.MM" },
                { kind: "weather", display: "sun", weatherIcon: true },
                { kind: "weather", display: "temp", weatherIcon: true },
            ],
            itemGap: 0.9,
            padding: 0,
            letterSpacing: -0.14,
            textSize: 111,
        },
    ],
};

// Everything the app reads from localStorage. `extra` overrides single keys.
export function seedStorage(layout = DEMO_LAYOUT, extra = {})
{
    return {
        lang: "en",
        layoutMigrated: true,
        clockLayout: layout,
        weatherReport: WEATHER_SEED.weatherReport,
        sunDays: WEATHER_SEED.sunDays,
        ...extra,
    };
}

// Runs in the page before any app code: localStorage, a stand-in for the Tauri IPC (only the
// clock window needs it), and the fake cursor.
function initScript({ storage, cursor })
{
    if (!sessionStorage.getItem("demoSeeded"))
    {
        localStorage.clear();
        for (const [key, value] of Object.entries(storage))
        {
            localStorage.setItem(key, JSON.stringify(value));
        }
        sessionStorage.setItem("demoSeeded", "1");
    }

    let callbackId = 0;
    window.__TAURI_INTERNALS__ = {
        metadata: { currentWindow: { label: "main" }, currentWebview: { windowLabel: "main", label: "main" } },
        invoke: async () => null,
        transformCallback: () => ++callbackId,
        unregisterCallback: () => undefined,
        convertFileSrc: (path) => path,
    };
    window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => undefined };

    if (!cursor)
    {
        return;
    }
    window.addEventListener("DOMContentLoaded", () =>
    {
        const pointer = document.createElement("div");
        pointer.id = "demo-cursor";
        pointer.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2.5 L4 19.5 L8.6 15.4 L11.6 22 L14.6 20.7 L11.7 14.3 L18 14.3 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
        Object.assign(pointer.style, {
            position: "fixed",
            left: "0px",
            top: "0px",
            width: "26px",
            height: "26px",
            zIndex: "2147483647",
            pointerEvents: "none",
            transform: "translate(-640px, -640px)",
            filter: "drop-shadow(0 2px 3px rgba(0,0,0,.35))",
        });
        document.body.appendChild(pointer);
        const move = (event) =>
        {
            pointer.style.transform = `translate(${event.clientX - 4}px, ${event.clientY - 2}px)`;
        };
        window.addEventListener("pointermove", move, true);
        window.addEventListener("pointerdown", (event) =>
        {
            move(event);
            const ring = document.createElement("div");
            Object.assign(ring.style, {
                position: "fixed",
                left: `${event.clientX - 16}px`,
                top: `${event.clientY - 16}px`,
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(34, 139, 74, .28)",
                border: "2px solid rgba(34, 139, 74, .7)",
                zIndex: "2147483646",
                pointerEvents: "none",
                transition: "transform .45s ease-out, opacity .45s ease-out",
                transform: "scale(.4)",
                opacity: "1",
            });
            document.body.appendChild(ring);
            requestAnimationFrame(() =>
            {
                ring.style.transform = "scale(1.3)";
                ring.style.opacity = "0";
            });
            setTimeout(() => ring.remove(), 600);
        }, true);
    });
}

export async function openPage({ path, storage = seedStorage(), viewport = { width: 1280, height: 800 }, scale = 1, cursor = true, css = "", time = START_TIME })
{
    const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
    const context = await browser.newContext({ viewport, deviceScaleFactor: scale });
    // No real weather requests: the cache above is what the clock shows.
    await context.route(/wttr\.in|sunrise|sunset/, (route) => route.abort());
    const page = await context.newPage();
    page.on("pageerror", (error) => console.warn("page error:", error.message));
    await page.clock.install({ time });
    await page.addInitScript(initScript, { storage, cursor });
    await page.goto(`${DEV_SERVER}/${path}`);
    if (css)
    {
        await page.addStyleTag({ content: css });
    }
    await page.waitForTimeout(1500);
    return { browser, page };
}

// Moves the fake (and real) pointer along a smooth ease-in-out path.
export async function glide(page, from, to, duration = 600)
{
    const steps = stepper ? Math.max(1, Math.round(duration * stepper.fps / 1000)) : Math.max(8, Math.round(duration / 16));
    for (let step = 1; step <= steps; step++)
    {
        const progress = step / steps;
        const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        await page.mouse.move(from.x + (to.x - from.x) * eased, from.y + (to.y - from.y) * eased);
        await wait(page, duration / steps);
    }
}

// The stepped recording in progress, if any (see startSteppedRecording).
let stepper = null;

// Waits `ms` of page time: real time, or whole frames of a stepped recording.
export async function wait(page, ms)
{
    if (!stepper)
    {
        await page.waitForTimeout(ms);
        return;
    }
    const frames = Math.max(1, Math.round(ms * stepper.fps / 1000));
    for (let frame = 0; frame < frames; frame++)
    {
        await stepper.frame();
    }
}

// Pointer helper that remembers where it is, so every move can glide.
// Mouse presses during the current recording, written to out/<clip>.events.json in clip time:
// the showreel times its cuts and switches by them.
const presses = [];

function press(kind)
{
    presses.push({ kind, time: stepper ? stepper.time() : Date.now() / 1000 });
}

export function pointer(page, start = { x: 640, y: 760 })
{
    let at = { ...start };
    return {
        async to(target, duration = 600)
        {
            const point = typeof target === "string" ? await center(page, target) : target;
            await glide(page, at, point, duration);
            at = point;
            return point;
        },
        async click(target, duration = 600)
        {
            await this.to(target, duration);
            press("click");
            await page.mouse.down();
            await wait(page, 90);
            await page.mouse.up();
        },
        async rightClick(target, duration = 600)
        {
            await this.to(target, duration);
            press("click");
            await page.mouse.down({ button: "right" });
            await page.mouse.up({ button: "right" });
        },
        async drag(target, duration = 900)
        {
            press("grab");
            await page.mouse.down();
            await wait(page, 150);
            await this.to(target, duration);
            await wait(page, 250);
            press("drop");
            await page.mouse.up();
        },
        get at()
        {
            return at;
        },
    };
}

export async function center(page, selector)
{
    const box = await page.locator(selector).first().boundingBox();
    if (!box)
    {
        throw new Error(`No box for ${selector}`);
    }
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// Records the page into numbered JPEGs plus an ffmpeg concat list with each frame's duration.
// A tight screenshot loop instead of the DevTools screencast: headless Chromium sends
// screencast frames in CSS pixels only, screenshots honour the device scale factor (~40 fps).
export async function startRecording(page, name)
{
    const directory = join(OUT, "frames", name);
    rmSync(directory, { recursive: true, force: true });
    mkdirSync(directory, { recursive: true });
    const session = await page.context().newCDPSession(page);
    const frames = [];
    presses.length = 0;
    let running = true;
    const loop = (async () =>
    {
        while (running)
        {
            const time = Date.now() / 1000;
            const shot = await session.send("Page.captureScreenshot", { format: "jpeg", quality: 92, optimizeForSpeed: true });
            const file = join(directory, `${String(frames.length).padStart(5, "0")}.jpg`);
            writeFileSync(file, Buffer.from(shot.data, "base64"));
            frames.push({ file, time });
        }
    })();
    return {
        async stop()
        {
            await page.waitForTimeout(300);
            running = false;
            await loop;
            const endTime = Date.now() / 1000;
            const lines = frames.map((frame, index) =>
            {
                const next = frames[index + 1]?.time ?? endTime;
                return `file '${frame.file}'\nduration ${Math.max(0.001, next - frame.time).toFixed(4)}`;
            });
            lines.push(`file '${frames.at(-1).file}'`);
            const list = join(directory, "list.txt");
            writeFileSync(list, lines.join("\n") + "\n");
            const start = frames[0].time;
            const events = presses.map((event) => ({ kind: event.kind, time: +(event.time - start).toFixed(3) }));
            writeFileSync(join(OUT, `${name}.events.json`), JSON.stringify(events));
            // A constant-rate master clip: input for the GIFs.
            const master = join(OUT, `${name}.mp4`);
            execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list,
                "-vf", "fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-crf", "14", "-preset", "slow", "-pix_fmt", "yuv420p", master]);
            console.log(`${name}: ${frames.length} frames -> ${master}`);
            return master;
        },
    };
}

// Records frame by frame on the page's fake clock: every frame moves the clock (timers,
// requestAnimationFrame, so the flip cards too) by exactly 1/fps s, then takes a screenshot at
// `scale` x. Smooth 30 fps at 2x although one 2x screenshot takes ~90 ms. CSS transitions run on
// real time; they are slowed to about the same pace. While it runs, `wait` and the pointer
// helpers step frames instead of sleeping.
export async function startSteppedRecording(page, name, { fps = 30, scale = 2 } = {})
{
    const directory = join(OUT, "frames", name);
    rmSync(directory, { recursive: true, force: true });
    mkdirSync(directory, { recursive: true });
    const session = await page.context().newCDPSession(page);
    await session.send("Animation.enable");
    await session.send("Animation.setPlaybackRate", { playbackRate: 0.35 });
    const now = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(now + 50);
    const viewport = page.viewportSize();
    const clip = { x: 0, y: 0, width: viewport.width, height: viewport.height, scale };
    let count = 0;
    presses.length = 0;
    stepper = {
        fps,
        time: () => count / fps,
        async frame()
        {
            await page.clock.runFor(1000 / fps);
            const shot = await session.send("Page.captureScreenshot", { format: "jpeg", quality: 94, clip });
            writeFileSync(join(directory, `${String(count).padStart(5, "0")}.jpg`), Buffer.from(shot.data, "base64"));
            count++;
        },
    };
    return {
        async stop()
        {
            stepper = null;
            writeFileSync(join(OUT, `${name}.events.json`), JSON.stringify(presses));
            const master = join(OUT, `${name}.mp4`);
            execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", join(directory, "%05d.jpg"),
                "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-crf", "12", "-preset", "slow", "-pix_fmt", "yuv420p", master]);
            console.log(`${name}: ${count} frames -> ${master}`);
            return master;
        },
    };
}
