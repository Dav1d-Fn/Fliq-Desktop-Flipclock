import { useEffect, useState } from "react";
import { Select } from "@mantine/core";
import { invoke } from "@tauri-apps/api/core";
import { useStrings } from "../../../i18n/useStrings";
import { SettingRow } from "../controls/SettingRow";

// Linux only: how the clock stays on top. Hidden on Windows/macOS ("native"). The choice lives
// in linux.json on the Rust side, not in localStorage, and applies after a restart.
export function OverlayModeRow()
{
    const [platformMode, setPlatformMode] = useState("native");
    const [preference, setPreference] = useState("auto");
    const strings = useStrings();

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

    const overlayModeOptions = [
        { value: "auto", label: strings.general.overlayAuto },
        { value: "layer-shell", label: "Layer-Shell" },
        { value: "x11", label: strings.general.overlayX11 },
    ];

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
            label={<>{strings.general.overlayLabel} <span className="platform-tag">Linux</span></>}
            description={strings.general.overlayDescription}
        >
            <Select
                aria-label={strings.general.overlayLabel}
                value={preference}
                onChange={changePreference}
                data={overlayModeOptions}
                allowDeselect={false}
                w={200}
            />
        </SettingRow>
    );
}
