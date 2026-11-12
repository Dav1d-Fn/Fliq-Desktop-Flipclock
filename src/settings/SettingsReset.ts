import { getDefaultStore, type WritableAtom } from "jotai";
import { RESET } from "jotai/utils";
import { invoke } from "@tauri-apps/api/core";
import { ATOMS } from "./atoms";

type ResettableAtom = WritableAtom<unknown, [typeof RESET], void>;

// "Reset all settings to defaults" from the styling window.
export class SettingsReset
{
    // RESET removes each key from localStorage; the other windows pick that up through the
    // storage event. Autostart stays: it mirrors the system entry, not a style choice. The clock
    // position stays too (it lives in Rust), otherwise the clock would jump away.
    static async resetAll(): Promise<void>
    {
        const store = getDefaultStore();
        for (const [name, atom] of Object.entries(ATOMS))
        {
            if (name !== "AUTOSTART")
            {
                store.set(atom as ResettableAtom, RESET);
            }
        }

        const overlay = await invoke<{ mode: string }>("get_overlay_state").catch(() => null);
        if (overlay && overlay.mode !== "native")
        {
            await invoke("set_overlay_mode", { mode: "auto" })
                .catch((error) => console.error("set_overlay_mode failed:", error));
        }
    }
}
