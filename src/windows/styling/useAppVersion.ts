import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";

// Version of the running build; `undefined` until Tauri answered.
export function useAppVersion(): string | undefined
{
    const [version, setVersion] = useState<string | undefined>(undefined);

    useEffect(() =>
    {
        getVersion()
            .then(setVersion)
            .catch(() => undefined);
    }, []);

    return version;
}
