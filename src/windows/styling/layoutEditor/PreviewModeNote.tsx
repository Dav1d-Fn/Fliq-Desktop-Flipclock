import { IconLayoutDashboard } from "@tabler/icons-react";

// Inspector content while the editor shows the plain preview.
export function PreviewModeNote()
{
    return (
        <div className="preview-note">
            <div className="preview-note-icon">
                <IconLayoutDashboard size={26} stroke={1.8} color="var(--fliq-text-muted)" />
            </div>
            <div className="preview-note-title">Preview mode</div>
            <div className="preview-note-text">This is how the clock looks on your desktop. Switch to Edit to change it.</div>
        </div>
    );
}
