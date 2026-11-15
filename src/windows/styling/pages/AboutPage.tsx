import type { MouseEvent } from "react";
import { Button, Group } from "@mantine/core";
import { IconBrandGithub } from "@tabler/icons-react";
import { PROJECT_LINKS } from "../../../tuxhub/projectLinks.ts";
import { useSettingsHost } from "../host/SettingsHost";
import { FliqLogo } from "../layout/FliqLogo";
import { useAppVersion } from "../useAppVersion";

export function AboutPage()
{
    const host = useSettingsHost();
    const version = useAppVersion();

    // Where the page cannot open a browser itself (embedded in tuxhub), the host does it.
    function opener(id: keyof typeof PROJECT_LINKS)
    {
        return (event: MouseEvent) =>
        {
            if (host.openLink)
            {
                event.preventDefault();
                host.openLink(id);
            }
        };
    }

    return (
        <div className="about">
            <FliqLogo size={64} />
            <h1 className="page-title" style={{ marginTop: 16 }}>Fliq</h1>
            <p className="page-intro">{version ? `Version ${version}` : " "}</p>
            <Group gap={10} mt={24} justify="center">
                <Button
                    component="a"
                    href={PROJECT_LINKS.github}
                    target="_blank"
                    onClick={opener("github")}
                    variant="default"
                    size="md"
                    leftSection={<IconBrandGithub size={18} />}
                >
                    View on GitHub
                </Button>
                <Button
                    component="a"
                    href={PROJECT_LINKS.kofi}
                    target="_blank"
                    onClick={opener("kofi")}
                    size="md"
                    c="fliqGreen.9"
                    leftSection={<img src={`${import.meta.env.BASE_URL}KofiPour_112.png`} alt="" style={{ width: 18, height: 18 }} />}
                >
                    Support on Ko-fi
                </Button>
            </Group>
        </div>
    );
}
