import { ReactNode } from "react";
import { Anchor, Group, Text, ThemeIcon } from "@mantine/core";

interface LinkButtonProps
{
    url: string;
    text: string;
    icon: ReactNode;
    // Small bold text after the label, e.g. the app version.
    badge?: string;
}

// External link styled as a light button; opens in the system browser.
export function LinkButton({ url, text, icon, badge }: LinkButtonProps)
{
    return (
        <Anchor href={url} target="_blank" underline="never" className="link-button">
            <Group justify="flex-end">
                <ThemeIcon variant="light" radius="xl" size={24}>
                    {icon}
                </ThemeIcon>
                <Text size="sm" c="dimmed">
                    {text}
                </Text>
                {badge && (
                    <Text size="sm" fw={700} c="gray">
                        {badge}
                    </Text>
                )}
            </Group>
        </Anchor>
    );
}
