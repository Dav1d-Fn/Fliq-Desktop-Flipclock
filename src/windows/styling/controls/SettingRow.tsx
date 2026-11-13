import { ReactNode } from "react";

interface SettingRowProps
{
    // Left out when the control brings its own label (FormatField).
    label?: ReactNode;
    description?: ReactNode;
    // The control: right of the label, or below it when `stacked`.
    children: ReactNode;
    // Label on top and the control in full width below (format fields).
    stacked?: boolean;
}

// One setting inside a SettingsCard: label and short description left, control right.
export function SettingRow({ label, description, children, stacked = false }: SettingRowProps)
{
    return (
        <div className={stacked ? "setting-row stacked" : "setting-row"}>
            {label && (
                <div>
                    <div className="setting-label">{label}</div>
                    {description && <div className="setting-description">{description}</div>}
                </div>
            )}
            {stacked ? children : <div className="setting-control">{children}</div>}
        </div>
    );
}
