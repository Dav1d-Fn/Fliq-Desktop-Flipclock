// Where the settings atoms read and write while Fliq's settings page runs embedded in tuxhub:
// a copy of the running clock's settings, kept in step over the tuxhub socket. Takes the place
// of localStorage there (see SettingsStorage). Pure, so `npm test` runs it with plain Node.

export interface SettingsTransport
{
    // Sends one `settings.set`; resolves with the value as Fliq applied it, rejects when Fliq
    // refused it.
    set: (key: string, value: unknown) => Promise<unknown>;
}

type Listener = (value: string | null) => void;

export class RemoteSettingsBackend
{
    private readonly transport: SettingsTransport;
    private readonly onRefused: (key: string, message: string) => void;
    // Values as JSON text, like localStorage holds them.
    private readonly values = new Map<string, string>();
    // The last value of each key the clock is known to hold: what a refused write goes back to.
    private readonly confirmed = new Map<string, string | null>();
    // Number of the write `confirmed` comes from, so a late answer to an older write never
    // replaces a newer confirmed value.
    private readonly confirmedAt = new Map<string, number>();
    // Number of the latest write per key that is still unanswered.
    private readonly inFlight = new Map<string, number>();
    private readonly listeners = new Map<string, Set<Listener>>();
    private writeCount = 0;

    constructor(transport: SettingsTransport, onRefused: (key: string, message: string) => void)
    {
        this.transport = transport;
        this.onRefused = onRefused;
    }

    // The clock's settings at the start, before any atom reads.
    load(values: Record<string, unknown>): void
    {
        for (const [key, value] of Object.entries(values))
        {
            const text = JSON.stringify(value);
            this.values.set(key, text);
            this.confirmed.set(key, text);
        }
    }

    getItem(key: string): string | null
    {
        return this.values.get(key) ?? null;
    }

    setItem(key: string, text: string): void
    {
        if (this.values.get(key) === text)
        {
            return;
        }
        this.values.set(key, text);

        const writeNumber = ++this.writeCount;
        this.inFlight.set(key, writeNumber);
        this.transport.set(key, JSON.parse(text)).then(
            (applied) =>
            {
                const latest = this.finished(key, writeNumber);
                if (writeNumber <= (this.confirmedAt.get(key) ?? 0))
                {
                    return;
                }
                const appliedText = JSON.stringify(applied);
                this.confirmed.set(key, appliedText);
                this.confirmedAt.set(key, writeNumber);
                // The latest write, or an older one with nothing newer on its way: the page shows
                // what the clock now holds.
                if ((latest || !this.inFlight.has(key)) && appliedText !== this.values.get(key))
                {
                    this.replace(key, appliedText);
                }
            },
            (error: unknown) =>
            {
                // A newer write of the same key is on its way: its answer decides.
                if (this.finished(key, writeNumber))
                {
                    this.replace(key, this.confirmed.get(key) ?? null);
                    this.onRefused(key, error instanceof Error ? error.message : String(error));
                }
            },
        );
    }

    // Jotai removes a key to reset an atom. The embedded page resets through `settings.reset`,
    // which reports the new values itself; here only the local copy goes.
    removeItem(key: string): void
    {
        this.replace(key, null);
    }

    // Jotai's hook for changes that did not come from this page.
    subscribe(key: string, listener: Listener): () => void
    {
        const listeners = this.listeners.get(key) ?? new Set<Listener>();
        listeners.add(listener);
        this.listeners.set(key, listeners);
        return () =>
        {
            listeners.delete(listener);
        };
    }

    // Values the clock reports as changed (`settings-changed`). A key with an unanswered write
    // keeps the value being written, so typing or dragging is not overwritten.
    applyRemote(values: Record<string, unknown>): void
    {
        for (const [key, value] of Object.entries(values))
        {
            const text = JSON.stringify(value);
            this.confirmed.set(key, text);
            if (!this.inFlight.has(key) && this.values.get(key) !== text)
            {
                this.replace(key, text);
            }
        }
    }

    // True when `writeNumber` is the latest write of the key; that write is then done.
    private finished(key: string, writeNumber: number): boolean
    {
        if (this.inFlight.get(key) !== writeNumber)
        {
            return false;
        }
        this.inFlight.delete(key);
        return true;
    }

    private replace(key: string, text: string | null): void
    {
        if (text === null)
        {
            this.values.delete(key);
        }
        else
        {
            this.values.set(key, text);
        }
        this.listeners.get(key)?.forEach((listener) => listener(text));
    }
}
