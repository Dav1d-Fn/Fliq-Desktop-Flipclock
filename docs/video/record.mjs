// Records the clips for the README GIFs and the showreel from the running dev server (npm run dev).
// Usage: node record.mjs [scene ...]   (no arguments: all scenes)
// Output: out/<scene>.mp4 (30 fps master clips) and a few out/<name>.png stills.
import { center, DEMO_LAYOUT, openPage, OUT, pointer, seedStorage, startRecording, startSteppedRecording, wait } from "./lib.mjs";

const EDITOR = "stylingMenu.html";

const WALLPAPER = `
    radial-gradient(ellipse at 18% 22%, rgba(110, 140, 220, .55), transparent 55%),
    radial-gradient(ellipse at 82% 78%, rgba(230, 120, 90, .45), transparent 55%),
    radial-gradient(ellipse at 70% 15%, rgba(160, 110, 200, .35), transparent 50%),
    linear-gradient(135deg, #171c2e, #2c2540)`;

// The editor with a free third row: room to add, drag and group.
const ROOMY_LAYOUT = { ...DEMO_LAYOUT, rows: 3, rowHeights: [65, 35, 40] };

const GROUP_LAYOUT = {
    ...ROOMY_LAYOUT,
    blocks: [
        ...DEMO_LAYOUT.blocks,
        { id: 3, kind: "date", x: 0, y: 2, w: 2, h: 1, display: "dddd", padding: 6 },
        { id: 4, kind: "weather", x: 2, y: 2, w: 2, h: 1, display: "temp", weatherIcon: true, padding: 6 },
    ],
};

const CENTERED_CLOCK = `
    html, body { min-height: 100vh; background: ${WALLPAPER} !important; }
    #maindiv { left: 50% !important; top: 50% !important; transform: translate(-50%, -50%); }
    #flipclock-container { box-shadow: 0 30px 80px rgba(0, 0, 0, .45); }`;

const pause = wait;

// The reel's editor clips start after the full hour: the opening already showed the flip, and
// the clock must not jump back to 09:59 between cuts.
const AFTER_THE_HOUR = new Date(2026, 10, 13, 10, 0, 20);

async function boxOf(page, selector)
{
    const box = await page.locator(selector).first().boundingBox();
    return { ...box, cx: box.x + box.width / 2, cy: box.y + box.height / 2 };
}

// Drags a Mantine slider's thumb sideways by `dx` px.
async function slide(page, mouse, label, dx)
{
    const thumb = await boxOf(page, `[aria-label^='${label}'] [role='slider']`);
    await mouse.to({ x: thumb.cx, y: thumb.cy }, 500);
    await mouse.drag({ x: thumb.cx + dx, y: thumb.cy }, 900);
}

const scenes = {
    // The clock alone on a desktop-like background, flipping over to the full hour.
    async hero()
    {
        const { browser, page } = await openPage({
            path: "index.html",
            viewport: { width: 1280, height: 720 },
            cursor: false,
            storage: seedStorage(DEMO_LAYOUT, { clockScale: 240 }),
            css: CENTERED_CLOCK,
        });
        const recording = await startRecording(page, "hero");
        await pause(page, 9000);
        await recording.stop();
        await page.screenshot({ path: `${OUT}hero.png` });
        await browser.close();
    },

    // Add a row, add a weather block, drag it aside, fill the gap with a date block.
    async add()
    {
        const { browser, page } = await openPage({ path: EDITOR });
        const mouse = pointer(page);
        const recording = await startRecording(page, "add");
        await pause(page, 500);
        await mouse.click("[aria-label='Add row']", 700);
        await pause(page, 500);
        await mouse.click(".block-tile:has-text('Weather')", 700);
        await pause(page, 900);
        const block = await boxOf(page, ".block-hitbox.selected");
        await mouse.to({ x: block.cx, y: block.cy }, 600);
        await mouse.drag({ x: block.cx + block.width + 4, y: block.cy }, 900);
        await pause(page, 500);
        // The next block takes the first free spot: the one just cleared.
        await mouse.click(".block-tile:has-text('Date')", 900);
        await pause(page, 1000);
        await mouse.click("label:has-text('Preview')", 700);
        await pause(page, 1800);
        await recording.stop();
        await browser.close();
    },

    // Drop one block onto another to group them, then reorder from the right-click menu.
    async group()
    {
        const { browser, page } = await openPage({ path: EDITOR, storage: seedStorage(GROUP_LAYOUT) });
        const mouse = pointer(page);
        const recording = await startRecording(page, "group");
        await pause(page, 500);
        const weather = await boxOf(page, ".clock-block[data-block-id='4']");
        const date = await boxOf(page, ".clock-block[data-block-id='3']");
        await mouse.to({ x: weather.cx, y: weather.cy }, 800);
        await mouse.drag({ x: date.cx, y: date.cy }, 1100);
        await pause(page, 1100);
        // The group sits on the target's cells; pull it over the freed ones.
        const handle = await center(page, ".resize-handle.right");
        await mouse.to(handle, 600);
        await mouse.drag({ x: handle.x + weather.width, y: handle.y }, 800);
        await pause(page, 900);
        const member = await boxOf(page, ".clock-block[data-block-id='3'] [data-member='1']");
        await mouse.rightClick({ x: member.cx, y: member.cy }, 700);
        await pause(page, 700);
        await mouse.click("[role='menuitem']:has-text('Move left')", 600);
        await pause(page, 1200);
        await page.keyboard.press("Escape");
        await mouse.to({ x: 640, y: 700 }, 600);
        await pause(page, 900);
        await recording.stop();
        await browser.close();
    },

    // Per-block settings: own background, letter spacing, offset; then the whole clock.
    async inspector()
    {
        const { browser, page } = await openPage({ path: EDITOR });
        const mouse = pointer(page);
        const recording = await startRecording(page, "inspector");
        await pause(page, 400);
        const group = await boxOf(page, ".clock-block[data-block-id='2']");
        await mouse.click({ x: group.cx, y: group.cy }, 800);
        await pause(page, 600);
        const inspector = await boxOf(page, "aside.inspector");
        await mouse.to({ x: inspector.cx, y: inspector.cy }, 600);
        await page.locator("label:has-text('Own background')").scrollIntoViewIfNeeded();
        // Scroll with the wheel so it looks like a hand did it.
        await page.locator("aside.inspector").evaluate((element) => element.scrollTo({ top: 0 }));
        for (let step = 0; step < 6; step++)
        {
            await page.mouse.wheel(0, 70);
            await pause(page, 60);
        }
        await pause(page, 400);
        await mouse.click("label:has-text('Own background')", 600);
        await pause(page, 700);
        await slide(page, mouse, "Text size", -14);
        await pause(page, 400);
        await slide(page, mouse, "Letter spacing", 8);
        await pause(page, 600);
        for (let step = 0; step < 16; step++)
        {
            await page.mouse.wheel(0, -90);
            await pause(page, 50);
        }
        await pause(page, 300);
        await mouse.click("label:has-text('Whole clock')", 800);
        await pause(page, 600);
        await slide(page, mouse, "Corner rounding", 45);
        await pause(page, 1200);
        await recording.stop();
        await browser.close();
    },

    // Size a column, change a gap, then undo it all and redo one step.
    async grid()
    {
        const { browser, page } = await openPage({ path: EDITOR });
        const mouse = pointer(page);
        const recording = await startRecording(page, "grid");
        await pause(page, 400);
        await mouse.click(".track-bar.column >> nth=3", 800);
        await pause(page, 500);
        await slide(page, mouse, "Width of column", 70);
        await pause(page, 400);
        // The gap's hit area reaches past the clock's edge; click there, not on a block.
        const gap = await boxOf(page, ".gap-target.row >> nth=0");
        await mouse.click({ x: gap.x + 6, y: gap.cy }, 800);
        await pause(page, 500);
        await slide(page, mouse, "Space between rows", 50);
        await pause(page, 600);
        for (let step = 0; step < 2; step++)
        {
            await mouse.click("[aria-label='Undo']", step === 0 ? 800 : 300);
            await pause(page, 700);
        }
        await mouse.click("[aria-label='Redo']", 400);
        await pause(page, 1300);
        await recording.stop();
        await browser.close();
    },

    // --- Showreel clips (reel/): recorded at 2x, so the camera can push in and stay sharp. ---

    // The clock alone, a few seconds before the full hour, for the opening close-up.
    async "reel-clock"()
    {
        const { browser, page } = await openPage({
            path: "index.html",
            viewport: { width: 2000, height: 900 },
            cursor: false,
            storage: seedStorage(DEMO_LAYOUT, { clockScale: 560 }),
            css: "html, body { background: #000 !important; }",
            time: new Date(2026, 10, 13, 9, 59, 55),
        });
        const box = await page.locator("#flipclock-container").boundingBox();
        await page.setViewportSize({ width: Math.round(box.width), height: Math.round(box.height) });
        const recording = await startSteppedRecording(page, "reel-clock");
        await pause(page, 7000);
        await recording.stop();
        await browser.close();
    },

    // Add a row, add a weather block, drag it aside, add a date block in the gap.
    async "reel-add"()
    {
        const { browser, page } = await openPage({ path: EDITOR, time: AFTER_THE_HOUR });
        const mouse = pointer(page, { x: 700, y: 700 });
        const recording = await startSteppedRecording(page, "reel-add");
        await pause(page, 300);
        await mouse.click("[aria-label='Add row']", 700);
        await pause(page, 350);
        await mouse.click(".block-tile:has-text('Weather')", 650);
        await pause(page, 500);
        const block = await boxOf(page, ".block-hitbox.selected");
        await mouse.to({ x: block.cx, y: block.cy }, 550);
        await mouse.drag({ x: block.cx + block.width + 4, y: block.cy }, 850);
        await pause(page, 300);
        await mouse.click(".block-tile:has-text('Date')", 800);
        await pause(page, 1600);
        await recording.stop();
        await browser.close();
    },

    // Drop one block onto another, widen the group, reorder a member from the right-click menu.
    async "reel-group"()
    {
        const { browser, page } = await openPage({ path: EDITOR, time: AFTER_THE_HOUR, storage: seedStorage(GROUP_LAYOUT) });
        const mouse = pointer(page, { x: 640, y: 720 });
        const recording = await startSteppedRecording(page, "reel-group");
        await pause(page, 300);
        const weather = await boxOf(page, ".clock-block[data-block-id='4']");
        const date = await boxOf(page, ".clock-block[data-block-id='3']");
        await mouse.to({ x: weather.cx, y: weather.cy }, 650);
        await mouse.drag({ x: date.cx, y: date.cy }, 950);
        await pause(page, 700);
        const handle = await center(page, ".resize-handle.right");
        await mouse.to(handle, 550);
        await mouse.drag({ x: handle.x + weather.width, y: handle.y }, 750);
        await pause(page, 500);
        const member = await boxOf(page, ".clock-block[data-block-id='3'] [data-member='1']");
        await mouse.rightClick({ x: member.cx, y: member.cy }, 600);
        await pause(page, 700);
        await mouse.click("[role='menuitem']:has-text('Move left')", 550);
        await pause(page, 500);
        await page.keyboard.press("Escape");
        await mouse.to({ x: 640, y: 680 }, 600);
        await pause(page, 600);
        await recording.stop();
        await browser.close();
    },

    // The inspector: own background, text size, letter spacing, offset.
    async "reel-style"()
    {
        const { browser, page } = await openPage({ path: EDITOR, time: AFTER_THE_HOUR });
        const mouse = pointer(page, { x: 640, y: 720 });
        const recording = await startSteppedRecording(page, "reel-style");
        await pause(page, 300);
        const group = await boxOf(page, ".clock-block[data-block-id='2']");
        await mouse.click({ x: group.cx, y: group.cy }, 700);
        await pause(page, 500);
        const inspector = await boxOf(page, "aside.inspector");
        await mouse.to({ x: inspector.cx, y: inspector.cy }, 500);
        for (let step = 0; step < 8; step++)
        {
            await page.mouse.wheel(0, 60);
            await pause(page, 45);
        }
        await pause(page, 300);
        await mouse.click("label:has-text('Own background')", 550);
        await pause(page, 500);
        await slide(page, mouse, "Text size", -14);
        await pause(page, 250);
        await slide(page, mouse, "Letter spacing", 8);
        await pause(page, 250);
        // The background fields pushed the offset down: scroll it into view.
        for (let step = 0; step < 5; step++)
        {
            await page.mouse.wheel(0, 60);
            await pause(page, 45);
        }
        await pause(page, 250);
        await slide(page, mouse, "Vertical offset", 28);
        await pause(page, 1200);
        await recording.stop();
        await browser.close();
    },

    // Column width, row height, then undo both.
    async "reel-grid"()
    {
        const { browser, page } = await openPage({ path: EDITOR, time: AFTER_THE_HOUR });
        const mouse = pointer(page, { x: 640, y: 720 });
        const recording = await startSteppedRecording(page, "reel-grid");
        await pause(page, 300);
        await mouse.click(".track-bar.column >> nth=3", 700);
        await pause(page, 350);
        await slide(page, mouse, "Width of column", 70);
        await pause(page, 300);
        await mouse.click(".track-bar.row >> nth=1", 700);
        await pause(page, 350);
        await slide(page, mouse, "Height of row", 40);
        await pause(page, 400);
        for (let step = 0; step < 2; step++)
        {
            await mouse.click("[aria-label='Undo']", step === 0 ? 750 : 300);
            await pause(page, 550);
        }
        await pause(page, 900);
        await recording.stop();
        await browser.close();
    },

    // Data › Time: 24 → 12 hours; then Data › Weather: Celsius → Fahrenheit.
    async "reel-data"()
    {
        const { browser, page } = await openPage({ path: EDITOR, time: AFTER_THE_HOUR });
        await page.locator(".styling-sidebar >> text=Time").first().click();
        await pause(page, 500);
        const mouse = pointer(page, { x: 760, y: 560 });
        const recording = await startSteppedRecording(page, "reel-data");
        await pause(page, 300);
        await mouse.click("label:has-text('12-hour')", 750);
        await pause(page, 900);
        await mouse.click(".styling-sidebar >> text=Weather", 750);
        await pause(page, 600);
        await mouse.click("label:has-text('Fahrenheit')", 750);
        await pause(page, 1200);
        await recording.stop();
        await browser.close();
    },

    // The clock as transparent stills: on the desktop at 10:00, and at 14:05 in 24 h °C, 12 h °C
    // and 12 h °F (the reel switches between those on the frame the control in reel-data lands).
    async "reel-stills"()
    {
        const afternoon = new Date(2026, 10, 13, 14, 5, 10);
        const variants = {
            "reel-clock-desktop": { time: new Date(2026, 10, 13, 10, 0, 10) },
            "reel-clock-24c": { time: afternoon },
            "reel-clock-12c": { time: afternoon, hourCycle: "12" },
            "reel-clock-12f": { time: afternoon, hourCycle: "12", weatherUnit: "F" },
        };
        for (const [name, { time, ...extra }] of Object.entries(variants))
        {
            const { browser, page } = await openPage({
                path: "index.html",
                viewport: { width: 1400, height: 600 },
                scale: 2,
                cursor: false,
                storage: seedStorage(DEMO_LAYOUT, { clockScale: 230, ...extra }),
                css: "html, body { background: transparent !important; }",
                time,
            });
            await page.locator("#flipclock-container").screenshot({ path: `${OUT}${name}.png`, omitBackground: true });
            await browser.close();
        }
    },

    // The clock in different looks and layouts at 09:59, as transparent stills: the reel's opening
    // montage flips through them before the real clock turns to 10:00 on the drop.
    async "reel-looks"()
    {
        const flipOnly = { ...DEMO_LAYOUT, rows: 1, rowHeights: [100], blocks: [DEMO_LAYOUT.blocks[0]] };
        const withSeconds = {
            ...DEMO_LAYOUT,
            columns: 6,
            blocks: [
                { ...DEMO_LAYOUT.blocks[0], w: 6, display: "HH:mm:ss" },
                { ...DEMO_LAYOUT.blocks[1], w: 6, itemGap: 1.4, textSize: 100 },
            ],
        };
        const tinted = (cardColor, extra = {}) => ({
            ...DEMO_LAYOUT,
            blocks: [{ ...DEMO_LAYOUT.blocks[0], cardColor, ...extra }, DEMO_LAYOUT.blocks[1]],
        });
        const looks = {
            "look-classic": { layout: flipOnly },
            "look-mint": { layout: tinted("#2fa84fff"), boxBackgroundColor: "#0e2216ff" },
            "look-paper": { layout: tinted("#ffffffff"), boxBackgroundColor: "#ebe7dfff", textColor: "#161616ff" },
            "look-amber": { layout: tinted("#f2a33aff"), boxBackgroundColor: "#1b1307ff" },
            "look-ocean": { layout: { ...withSeconds, blocks: [{ ...withSeconds.blocks[0], cardColor: "#1d3f73ff" }, withSeconds.blocks[1]] }, boxBackgroundColor: "#0c1c34ff" },
        };
        for (const [name, { layout, ...extra }] of Object.entries(looks))
        {
            const { browser, page } = await openPage({
                path: "index.html",
                viewport: { width: 2000, height: 900 },
                scale: 2,
                cursor: false,
                storage: seedStorage(layout, { clockScale: 380, ...extra }),
                css: "html, body { background: transparent !important; }",
                time: new Date(2026, 10, 13, 9, 59, 30),
            });
            await page.locator("#flipclock-container").screenshot({ path: `${OUT}${name}.png`, omitBackground: true });
            await browser.close();
        }
    },

    // Stills of the Data › Time page and the editor.
    async stills()
    {
        const { browser, page } = await openPage({ path: EDITOR, time: AFTER_THE_HOUR, cursor: false });
        await page.screenshot({ path: `${OUT}editor.png` });
        await page.locator(".styling-sidebar >> text=Time").first().click();
        await pause(page, 600);
        await page.screenshot({ path: `${OUT}time.png` });
        await browser.close();
    },
};

const wanted = process.argv.slice(2);
for (const [name, run] of Object.entries(scenes))
{
    if (wanted.length === 0 || wanted.includes(name))
    {
        await run();
    }
}
