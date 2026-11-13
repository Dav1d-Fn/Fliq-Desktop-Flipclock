import { useEffect, useState } from "react";
import { Select } from "@mantine/core";
import { invoke } from "@tauri-apps/api/core";
import { SettingRow } from "../controls/SettingRow";

const OVERLAY_MODE_OPTIONS = [
    { value: "auto", label: "Auto (recommended)" },
    { value: "layer-shell", label: "Layer-Shell" },
    { value: "x11", label: "X11 compatibility" },
];

// Linux only: how the clock stays on top. Hidden on Windows/macOS ("native"). The choice lives
// in linux.json on the Rust side, not in localStorage, and applies after a restart.
export function OverlayModeRow()
{
    const [platformMode, setPlatformMode] = useState("native");
    const [preference, setPreference] = useState("auto");

    useEffect(() =>
    {
        invoke<{ mode: string; preference: string }>("get_overlay_state")
            .then((state) =>
            {
                setPlatformMode(state.mode);
                setPreference(state.preference);
            })
            .catch(() => setPlatformMode("native"));
    }, []);

    if (platformMode === "native")
    {
        return null;
    }

    function changePreference(value: string | null)
    {
        if (!value)
        {
            return;
        }
        // Shown right away, turned back if writing fails; otherwise the dropdown would show a
        // choice that was never saved.
        const previous = preference;
        setPreference(value);
        invoke("set_overlay_mode", { mode: value }).catch((error) =>
        {
            console.error("set_overlay_mode failed:", error);
            setPreference(previous);
        });
    }

    return (
        <SettingRow
            label={<>Overlay mode <span className="platform-tag">Linux</span></>}
            description="Layer-Shell stays above fullscreen windows but needs KDE, Sway or Hyprland. X11 works everywhere. Applies after a restart."
        >
            <Select
                aria-label="Overlay mode"
                value={preference}
                onChange={changePreference}
                data={OVERLAY_MODE_OPTIONS}
                allowDeselect={false}
                w={200}
            />
        </SettingRow>
    );
}
