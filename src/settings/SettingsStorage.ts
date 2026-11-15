import { createJSONStorage } from "jotai/utils";

// What the settings atoms need from their store: localStorage has this shape. `subscribe`
// reports changes made elsewhere; localStorage needs none (Jotai listens to storage events).
export interface SettingsBackend
{
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
    subscribe?: (key: string, listener: (value: string | null) => void) => () => void;
}

// Where every settings atom reads and writes. In Fliq's own windows that is localStorage, as
// always. The settings page embedded in tuxhub has no storage of its own: it puts the clock's
// settings here instead (RemoteSettingsBackend), before the atoms are created.
export class SettingsStorage
{
    private static remote: SettingsBackend | null = null;

    // Has to run before `atoms.ts` is first imported.
    static useRemote(backend: SettingsBackend): void
    {
        SettingsStorage.remote = backend;
    }

    static isRemote(): boolean
    {
        return SettingsStorage.remote !== null;
    }

    // The storage option for one `atomWithStorage`.
    static json<Value>()
    {
        const storage = createJSONStorage<Value>(() => SettingsStorage.remote ?? window.localStorage);
        const remote = SettingsStorage.remote;
        if (remote?.subscribe)
        {
            // Jotai only listens to storage events of a real localStorage; a remote backend
            // reports its changes itself.
            storage.subscribe = (key, callback, initialValue) => remote.subscribe!(key, (text) =>
            {
                callback(SettingsStorage.parsed(text, initialValue));
            });
        }
        return storage;
    }

    private static parsed<Value>(text: string | null, fallback: Value): Value
    {
        if (text === null)
        {
            return fallback;
        }
        try
        {
            return JSON.parse(text) as Value;
        }
        catch
        {
            return fallback;
        }
    }
}
