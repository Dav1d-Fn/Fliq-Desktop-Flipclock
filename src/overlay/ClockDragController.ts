import { invoke } from "@tauri-apps/api/core";
import { emitTo } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ClockWindow, type Monitor } from "./ClockWindow";
import { PointerMotion } from "./PointerMotion";

interface Point
{
    x: number;
    y: number;
}

// Moving the clock with the mouse.
//
// Layer-shell mode: the clock surface is as large as its output and the clock sits in it via a
// CSS transform (ClockWindow.placeClock). Dragging only moves an element, as smooth as any web
// page. Moving the surface itself is no option: KWin applies margin changes in batches ~200 ms
// late.
//
// While dragging, the clock is drawn on every frame at the position PointerMotion expects for
// that frame. Drawing only on pointer moves dropped every fifth frame or so, since WebKitGTK
// delivers them in bunches (measured: ~50 instead of 60 frames per second). WebKitGTK draws at
// most 60 frames per second, also on faster monitors.
//
// A layer surface belongs to exactly one output, so the clock is cut off at its edge. When it
// reaches onto another monitor while dragging, that monitor's ghost (a click-through full-screen
// window per output, created on the first drag) draws a copy of the clock there. Dropped on
// another monitor, the clock surface is moved there; the copy bridges that moment.
//
// X11/Windows/macOS: the window is as large as the clock and startDragging moves it.
export class ClockDragController
{
    private readonly element: HTMLElement;
    private mode = "native";
    // Output-LOCAL position of the clock in its surface; `monitorId` says which output.
    private position: Point = { x: 0, y: 0 };
    private monitors: Monitor[] = [];
    private monitorId: string | null = null;
    // One entry per pointerId, so a second pointing device cannot overwrite a first one's drag.
    private readonly activeDrags = new Map<number, () => void>();
    private readonly pointerDownListener = (event: PointerEvent) =>
    {
        void this.handlePointerDown(event);
    };

    constructor(element: HTMLElement)
    {
        this.element = element;
    }

    start(): void
    {
        this.element.addEventListener("pointerdown", this.pointerDownListener);

        ClockWindow.overlayState
            .then(async (state) =>
            {
                this.mode = state.mode;
                this.monitorId = state.monitor;
                if (state.mode !== "layer-shell")
                {
                    return;
                }

                this.monitors = await ClockWindow.fetchMonitors();
                const safe = this.rescuePosition(this.currentMonitor(), state.margin_x, state.margin_y);
                this.position = safe;
                ClockWindow.placeClock(safe.x, safe.y);

                // A stored value that was off is written back corrected at once, otherwise the
                // next start would pick up the same unusable value again.
                if (safe.x !== state.margin_x || safe.y !== state.margin_y)
                {
                    console.warn(`fliq: position ${state.margin_x}/${state.margin_y} was outside the monitor, corrected to ${safe.x}/${safe.y}`);
                    this.persistPlacement(safe.x, safe.y);
                }
            })
            .catch(() =>
            {
                // Builds without the command stay at "native".
            })
            .finally(() =>
            {
                // Shown only now; before, the clock would flash in the top left corner.
                const wrapper = ClockWindow.wrapper();
                if (wrapper)
                {
                    wrapper.style.visibility = "visible";
                }
            });
    }

    dispose(): void
    {
        this.element.removeEventListener("pointerdown", this.pointerDownListener);
        Array.from(this.activeDrags.values()).forEach((cleanup) => cleanup());
    }

    // The output a global point lies on. `undefined` in a gap between screens (layouts do not
    // have to be gapless).
    private monitorAt(globalX: number, globalY: number): Monitor | undefined
    {
        return this.monitors.find((monitor) =>
            globalX >= monitor.x && globalX < monitor.x + monitor.w
            && globalY >= monitor.y && globalY < monitor.y + monitor.h);
    }

    private currentMonitor(): Monitor | undefined
    {
        return this.monitors.find((monitor) => monitor.id === this.monitorId);
    }

    private ghostLabel(monitor: Monitor): string
    {
        return `ghost-${this.monitors.indexOf(monitor)}`;
    }

    // Keeps the whole clock on its monitor. Applied on release, not while dragging, where it may
    // reach across a monitor border.
    private clampToMonitor(monitor: Monitor, x: number, y: number): Point
    {
        const { width, height } = ClockWindow.clockSize();
        return {
            x: Math.round(Math.min(Math.max(0, monitor.w - width), Math.max(0, x))),
            y: Math.round(Math.min(Math.max(0, monitor.h - height), Math.max(0, y))),
        };
    }

    // On load a deliberately WEAKER rule than on release: only what lies completely outside, and
    // could not be found any more, is corrected. (A stored monitor that is gone is handled by
    // Rust at startup.)
    private rescuePosition(monitor: Monitor | undefined, x: number, y: number): Point
    {
        const bounds = monitor ?? { w: window.screen.width, h: window.screen.height };
        return {
            x: x < 0 || x >= bounds.w ? 40 : x,
            y: y < 0 || y >= bounds.h ? 40 : y,
        };
    }

    private persistPlacement(x: number, y: number): Promise<unknown>
    {
        const request = this.mode === "layer-shell" && this.monitorId
            ? invoke("set_overlay_placement", { monitorId: this.monitorId, x, y })
            : invoke("set_overlay_margin", { x, y, persist: true });
        return request.catch((error) => console.error("Saving the position failed:", error));
    }

    private async handlePointerDown(event: PointerEvent): Promise<void>
    {
        if (event.button !== 0)
        {
            return;
        }

        const target = event.currentTarget as HTMLElement;
        const pointerId = event.pointerId;

        // Capture right away, not after the await: from here on `target` gets all pointer
        // events, also outside the click area and on other monitors (Wayland gives the surface
        // an implicit grab while the button is held).
        target.setPointerCapture(pointerId);

        await ClockWindow.overlayState.catch(() => null);

        // Released during the await: nothing set up, nothing to clean up.
        if (!target.hasPointerCapture(pointerId))
        {
            return;
        }

        if (this.mode !== "layer-shell")
        {
            target.releasePointerCapture(pointerId);
            getCurrentWindow().startDragging();
            return;
        }

        // Fresh per drag, so a monitor plugged in since the start is known. The ghosts are
        // created from the same list (ghost_show), so the indices match.
        this.monitors = await ClockWindow.fetchMonitors();
        if (!target.hasPointerCapture(pointerId))
        {
            return;
        }

        this.startLayerShellDrag(target, pointerId, event.screenX, event.screenY);
    }

    private startLayerShellDrag(target: HTMLElement, pointerId: number, startScreenX: number, startScreenY: number): void
    {
        // Computed in GLOBAL coordinates, because only those are continuous across monitor
        // borders. Pointer deltas work for that, since the surface does not move while dragging.
        const home: Monitor = this.currentMonitor()
            ?? { id: "", x: 0, y: 0, w: window.innerWidth, h: window.innerHeight, scale: 1 };
        const others = this.monitors.filter((monitor) => monitor.id !== home.id);
        const originX = home.x + this.position.x;
        const originY = home.y + this.position.y;
        const { width, height } = ClockWindow.clockSize();

        // Dragging stays within the hull of all monitors; where the clock lands is decided on
        // release.
        const all = this.monitors.length ? this.monitors : [home];
        const minX = Math.min(...all.map((monitor) => monitor.x));
        const minY = Math.min(...all.map((monitor) => monitor.y));
        const maxX = Math.max(...all.map((monitor) => monitor.x + monitor.w)) - width;
        const maxY = Math.max(...all.map((monitor) => monitor.y + monitor.h)) - height;

        // Last real pointer position (clamped); decides where the clock lands on release.
        let globalX = originX;
        let globalY = originY;
        // Position drawn in the current frame, slightly ahead of the real one.
        let drawnX = originX;
        let drawnY = originY;
        const motion = new PointerMotion();
        motion.record(originX, originY, performance.now());
        let frame = 0;
        let ghostsShown = false;
        // Which ghosts currently show a copy; only those are sent "invisible".
        const ghostVisible = new Map<string, boolean>();

        const paintGhost = (monitor: Monitor, visible: boolean) =>
        {
            const label = this.ghostLabel(monitor);
            if (!visible && !ghostVisible.get(label))
            {
                return;
            }
            ghostVisible.set(label, visible);
            emitTo(label, "ghost-pos", { x: Math.round(drawnX - monitor.x), y: Math.round(drawnY - monitor.y), visible })
                .catch((error) => console.error("ghost-pos failed:", error));
        };

        // Runs on every frame until the drag ends.
        const paint = (frameTime: number) =>
        {
            frame = requestAnimationFrame(paint);

            const expected = motion.positionAt(frameTime) ?? { x: globalX, y: globalY };
            const nextX = Math.min(maxX, Math.max(minX, expected.x));
            const nextY = Math.min(maxY, Math.max(minY, expected.y));
            if (Math.round(nextX) === Math.round(drawnX) && Math.round(nextY) === Math.round(drawnY))
            {
                // Pointer held still: nothing to redraw, and no input region to send again.
                return;
            }
            drawnX = nextX;
            drawnY = nextY;
            ClockWindow.placeClock(drawnX - home.x, drawnY - home.y);
            if (!ghostsShown)
            {
                return;
            }
            others.forEach((monitor) => paintGhost(monitor,
                drawnX < monitor.x + monitor.w && drawnX + width > monitor.x
                && drawnY < monitor.y + monitor.h && drawnY + height > monitor.y));
        };
        frame = requestAnimationFrame(paint);

        // Show all ghosts (each empty, transparent and click-through). Positions only after
        // that, otherwise `ghost_show` would clear a copy that was just set.
        invoke("ghost_show")
            .then(() =>
            {
                ghostsShown = true;
            })
            .catch((error) => console.error("ghost_show failed:", error));

        const onMove = (event: PointerEvent) =>
        {
            if (event.pointerId !== pointerId)
            {
                return;
            }
            const pointerX = originX + (event.screenX - startScreenX);
            const pointerY = originY + (event.screenY - startScreenY);
            globalX = Math.min(maxX, Math.max(minX, pointerX));
            globalY = Math.min(maxY, Math.max(minY, pointerY));
            motion.record(pointerX, pointerY, event.timeStamp);
        };

        const detach = () =>
        {
            target.removeEventListener("pointermove", onMove);
            target.removeEventListener("pointerup", onEnd);
            target.removeEventListener("pointercancel", onEnd);
            if (target.hasPointerCapture(pointerId))
            {
                target.releasePointerCapture(pointerId);
            }
        };

        // Runs on every path that ends the drag. Rust also hides the ghosts after a safety
        // timeout, in case this webview dies first.
        const finish = () =>
        {
            detach();
            if (frame)
            {
                cancelAnimationFrame(frame);
            }
            invoke("ghost_hide").catch((error) => console.error("ghost_hide failed:", error));
            this.activeDrags.delete(pointerId);
        };

        const onEnd = async (event: PointerEvent) =>
        {
            if (event.pointerId !== pointerId)
            {
                return;
            }
            detach();
            if (frame)
            {
                cancelAnimationFrame(frame);
                frame = 0;
            }

            // The target monitor is the one under the middle of the clock.
            const destination = this.monitorAt(globalX + width / 2, globalY + height / 2)
                ?? this.monitorAt(globalX, globalY)
                ?? home;
            const position = this.clampToMonitor(destination, globalX - destination.x, globalY - destination.y);
            this.position = position;

            if (destination.id !== home.id && ghostsShown)
            {
                // The copy stands exactly at the target while the clock surface is moved there.
                // The clock itself stays invisible meanwhile, or it would flash on the old monitor.
                drawnX = destination.x + position.x;
                drawnY = destination.y + position.y;
                paintGhost(destination, true);
                others.filter((monitor) => monitor.id !== destination.id).forEach((monitor) => paintGhost(monitor, false));
                const wrapper = ClockWindow.wrapper();
                if (wrapper)
                {
                    wrapper.style.visibility = "hidden";
                }
                this.monitorId = destination.id;
                await this.persistPlacement(position.x, position.y);
                ClockWindow.placeClock(position.x, position.y);
                if (wrapper)
                {
                    wrapper.style.visibility = "visible";
                }
                // Two frames, so the clock is painted at its new place before the copy goes.
                await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            }
            else
            {
                this.monitorId = destination.id || this.monitorId;
                ClockWindow.placeClock(position.x, position.y);
                this.persistPlacement(position.x, position.y);
            }
            finish();
        };

        this.activeDrags.set(pointerId, finish);
        target.addEventListener("pointermove", onMove);
        target.addEventListener("pointerup", onEnd);
        target.addEventListener("pointercancel", onEnd);
    }
}
