import { Button, Group } from "@mantine/core";
import { IconBrandGithub } from "@tabler/icons-react";
import { FliqLogo } from "../layout/FliqLogo";
import { useAppVersion } from "../useAppVersion";

const GITHUB_URL = "https://github.com/Dav1d-Fn/Fliq-Desktop-Flipclock";
const KOFI_URL = "https://ko-fi.com/davidfn";

export function AboutPage()
{
    const version = useAppVersion();

    return (
        <div className="about">
            <FliqLogo size={64} />
            <h1 className="page-title" style={{ marginTop: 16 }}>Fliq</h1>
            <p className="page-intro">{version ? `Version ${version}` : " "}</p>
            <Group gap={10} mt={24}>
                <Button
                    component="a"
                    href={GITHUB_URL}
                    target="_blank"
                    variant="default"
                    size="md"
                    leftSection={<IconBrandGithub size={18} />}
                >
                    View on GitHub
                </Button>
                <Button
                    component="a"
                    href={KOFI_URL}
                    target="_blank"
                    size="md"
                    c="fliqGreen.9"
                    leftSection={<img src="/KofiPour_112.png" alt="" style={{ width: 18, height: 18 }} />}
                >
                    Support on Ko-fi
                </Button>
            </Group>
        </div>
    );
}
