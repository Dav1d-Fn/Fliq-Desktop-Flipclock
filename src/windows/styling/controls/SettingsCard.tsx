import { ReactNode } from "react";

interface SettingsCardProps
{
    title: string;
    // SettingRow elements.
    children: ReactNode;
}

// A titled group of setting rows.
export function SettingsCard({ title, children }: SettingsCardProps)
{
    return (
        <section>
            <div className="card-title">{title}</div>
            <div className="settings-card">
                {children}
            </div>
        </section>
    );
}
