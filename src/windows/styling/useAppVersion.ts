import { useEffect, useState } from "react";
import { useSettingsHost } from "./host/SettingsHost";

// Version of the running build; `undefined` until the host answered.
export function useAppVersion(): string | undefined
{
    const host = useSettingsHost();
    const [version, setVersion] = useState<string | undefined>(undefined);

    useEffect(() =>
    {
        host.version()
            .then(setVersion)
            .catch(() => undefined);
    }, [host]);

    return version;
}
