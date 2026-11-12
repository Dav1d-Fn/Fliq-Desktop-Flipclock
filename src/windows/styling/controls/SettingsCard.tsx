import { ReactNode } from "react";
import { Card, Divider, Title } from "@mantine/core";

interface SettingsCardProps
{
    title: string;
    children: ReactNode;
}

// One titled section of the styling window.
export function SettingsCard({ title, children }: SettingsCardProps)
{
    return (
        <Card shadow="sm" radius="md" withBorder>
            <Title order={4}>{title}</Title>
            <Divider my="sm" />
            {children}
        </Card>
    );
}
