import { getDefaultStore, type WritableAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ATOMS } from "../settings/atoms";
import { AppActions } from "../settings/AppActions";
import { schema, check, toLocale, Refusal, ACTION_IDS, type Options } from "./tuxhubSchema.ts";

interface Request
{
    rid: number;
    conn: number;
    method: string;
    params: unknown;
}

interface Reply
{
    result?: unknown;
    error?: { message: string; field?: string };
}

interface HandlerResult
{
    result: unknown;
    // Runs after the reply went out (used by "quit").
    after?: () => void;
}

// Any settings atom: readable as unknown, written only with values `check` has validated.
type Setting = WritableAtom<unknown, [never], void>;

// Schema key -> atom. The keys are the localStorage keys of the atoms.
const SETTINGS: Record<string, Setting> = {
    lang: ATOMS.LANGUAGE,
    boxBackgroundColor: ATOMS.BOX_BACKGROUND,
    boxRounded: ATOMS.BOX_RADIUS,
    clockPadding: ATOMS.CLOCK_PADDING,
    textFont: ATOMS.TEXT_FONT,
    textColor: ATOMS.TEXT_COLOR,
    clockTextSize: ATOMS.CLOCK_TEXT_SIZE,
    format: ATOMS.TIME_FORMAT,
    secondRowEnabled: ATOMS.SECOND_ROW_ENABLED,
    secondRowGap: ATOMS.SECOND_ROW_GAP,
    secondRowClockTextSize: ATOMS.SECOND_ROW_CLOCK_TEXT_SIZE,
    secondRowFormat: ATOMS.SECOND_ROW_TIME_FORMAT,
    clockSeparatorColor: ATOMS.CLOCK_SEPARATOR_COLOR,
    clockTextColor: ATOMS.CLOCK_TEXT_COLOR,
    flipCardBackground: ATOMS.FLIPCARD_BACKGROUND,
    flipcardRounded: ATOMS.FLIPCARD_RADIUS,
    seperatorString: ATOMS.SEPARATOR_STRING,
    weatherUnit: ATOMS.WEATHER_UNIT,
    weatherLocation: ATOMS.WEATHER_LOCATION,
    autostart: ATOMS.AUTOSTART,
    hideInTaskbar: ATOMS.HIDE_IN_TASKBAR,
    alwaysOnTop: ATOMS.ALWAYS_ON_TOP,
};

// tuxhub live interface: answers the requests that src-tauri/src/tuxhub.rs forwards to the
// clock window and reports changes of the settings, including those made in the styling window
// (they arrive here through the localStorage sync of atomWithStorage).
//
// Without the Rust side (Windows, macOS) `tuxhub_ready` fails and the bridge stays idle.
export class TuxhubBridge
{
    private readonly store = getDefaultStore();
    private readonly cleanups: (() => void)[] = [];
    private stopped = false;
    // Language of refusals: the one tuxhub last asked the schema in.
    private locale = "en";
    // The connection whose `set` is being applied right now. Jotai calls subscribers
    // synchronously inside `store.set`, so the change is not echoed back to its sender.
    private origin: number | null = null;

    // Starts the bridge; the returned function stops it (React effect cleanup).
    static start(): () => void
    {
        const bridge = new TuxhubBridge();
        void bridge.connect();
        return () => bridge.stop();
    }

    private async connect(): Promise<void>
    {
        const unlisten = await listen<Request>("tuxhub-request", ({ payload }) =>
        {
            void this.answer(payload);
        });
        this.keep(unlisten);

        // Only after the listener exists: the socket appears now, and tuxhub asks right away.
        try
        {
            await invoke("tuxhub_ready");
        }
        catch
        {
            return;
        }
        if (this.stopped)
        {
            return;
        }

        for (const [key, atom] of Object.entries(SETTINGS))
        {
            this.keep(this.store.sub(atom, () => this.reportChange(key, atom)));
        }
    }

    private stop(): void
    {
        this.stopped = true;
        this.cleanups.forEach((cleanup) => cleanup());
    }

    // Runs a cleanup right away if the bridge was stopped while it was being set up.
    private keep(cleanup: () => void): void
    {
        if (this.stopped)
        {
            cleanup();
        }
        else
        {
            this.cleanups.push(cleanup);
        }
    }

    private reportChange(key: string, atom: Setting): void
    {
        invoke("tuxhub_changed", { values: { [key]: this.store.get(atom) }, exclude: this.origin })
            .catch((error) => console.error("tuxhub_changed failed:", error));
        if (key === "secondRowEnabled")
        {
            invoke("tuxhub_schema_changed")
                .catch((error) => console.error("tuxhub_schema_changed failed:", error));
        }
    }

    private async answer(request: Request): Promise<void>
    {
        let reply: Reply;
        let after: (() => void) | undefined;
        try
        {
            const handled = await this.handle(request);
            reply = { result: handled.result };
            after = handled.after;
        }
        catch (error)
        {
            if (error instanceof Refusal)
            {
                reply = { error: { message: error.message, field: error.field } };
            }
            else
            {
                reply = { error: { message: error instanceof Error ? error.message : String(error) } };
            }
        }
        await invoke("tuxhub_respond", { rid: request.rid, ...reply }).catch(() => undefined);
        after?.();
    }

    private async handle(request: Request): Promise<HandlerResult>
    {
        const params = TuxhubBridge.asObject(request.params);
        switch (request.method)
        {
            case "schema":
                this.locale = toLocale(params.locale);
                return { result: schema(this.locale, this.options()) };
            case "get":
                return { result: { values: await this.values() } };
            case "set":
            {
                const key = typeof params.key === "string" ? params.key : "";
                const value = check(key, params.value, this.options(), this.locale);
                await this.apply(key, value, request.conn);
                return { result: { value } };
            }
            case "action":
                return this.runAction(params.id);
        }
        throw new Error(`unknown method ${request.method}`);
    }

    private async runAction(id: unknown): Promise<HandlerResult>
    {
        switch (id)
        {
            case "open-styling":
                await AppActions.openStyling();
                return { result: true };
            case "quit":
                // Like "Exit" in the context menu, after the answer is out.
                return { result: true, after: () => void AppActions.quit() };
        }
        throw new Error(`unknown action ${JSON.stringify(id)}, expected ${ACTION_IDS.join(" or ")}`);
    }

    // Same side effects as the context menu entries of the clock.
    private async apply(key: string, value: unknown, connection: number): Promise<void>
    {
        switch (key)
        {
            case "overlayMode":
                // Rust stores it and reports `changed` itself.
                await invoke("set_overlay_mode", { mode: value });
                return;
            case "autostart":
                await AppActions.setAutostart(value as boolean);
                break;
            case "hideInTaskbar":
                await AppActions.setHideInTaskbar(value as boolean);
                break;
            case "alwaysOnTop":
                await AppActions.setAlwaysOnTop(value as boolean);
                break;
        }

        this.origin = connection;
        try
        {
            // `check` validated the value against this key's schema field, so it fits the atom.
            this.store.set(SETTINGS[key], value as never);
        }
        finally
        {
            this.origin = null;
        }
    }

    private async values(): Promise<Record<string, unknown>>
    {
        const values: Record<string, unknown> = {};
        for (const [key, atom] of Object.entries(SETTINGS))
        {
            values[key] = this.store.get(atom);
        }
        const overlay = await invoke<{ preference: string }>("get_overlay_state");
        values.overlayMode = overlay.preference;
        return values;
    }

    private options(): Options
    {
        return { secondRowEnabled: this.store.get(ATOMS.SECOND_ROW_ENABLED) };
    }

    private static asObject(value: unknown): Record<string, unknown>
    {
        if (value && typeof value === "object" && !Array.isArray(value))
        {
            return value as Record<string, unknown>;
        }
        return {};
    }
}
