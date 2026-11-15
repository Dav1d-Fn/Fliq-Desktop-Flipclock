import { IconLayoutDashboard } from "@tabler/icons-react";
import { useStrings } from "../../../i18n/useStrings";

// Inspector content while the editor shows the plain preview.
export function PreviewModeNote()
{
    const text = useStrings().layout;

    return (
        <div className="preview-note">
            <div className="preview-note-icon">
                <IconLayoutDashboard size={26} stroke={1.8} color="var(--fliq-text-muted)" />
            </div>
            <div className="preview-note-title">{text.previewTitle}</div>
            <div className="preview-note-text">{text.previewText}</div>
        </div>
    );
}
