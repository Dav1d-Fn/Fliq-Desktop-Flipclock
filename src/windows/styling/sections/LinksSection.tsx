import { useEffect, useState } from "react";
import { Group } from "@mantine/core";
import { IconBrandGithub } from "@tabler/icons-react";
import { getVersion } from "@tauri-apps/api/app";
import { LinkButton } from "../controls/LinkButton";

// Ko-fi and GitHub links, with the version of the running build.
export function LinksSection()
{
    const [version, setVersion] = useState<string | undefined>(undefined);

    useEffect(() =>
    {
        getVersion()
            .then(setVersion)
            .catch(() => undefined);
    }, []);

    return (
        <Group grow>
            <LinkButton
                url="https://ko-fi.com/davidfn"
                text="Support on Ko-fi"
                icon={<img src="/KofiPour_112.png" alt="Ko-fi" style={{ width: 16, height: 16 }} />}
            />
            <LinkButton
                url="https://github.com/Dav1d-Fn/Fliq-Desktop-Flipclock"
                text="View on GitHub"
                badge={version}
                icon={<IconBrandGithub size={16} />}
            />
        </Group>
    );
}
