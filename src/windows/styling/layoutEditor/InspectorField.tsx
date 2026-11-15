import { ReactNode } from "react";
import { Tooltip } from "@mantine/core";
import { IconHelpCircle } from "@tabler/icons-react";

interface InspectorFieldProps
{
    label: string;
    // Id of the input the label belongs to; left out for groups of buttons.
    htmlFor?: string;
    // Longer explanation, behind a ? next to the label.
    help?: string;
    children: ReactNode;
}

// One labelled setting in the inspector column.
export function InspectorField({ label, htmlFor, help, children }: InspectorFieldProps)
{
    const labelText = htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span>{label}</span>;
    return (
        <div className="inspector-field">
            <div className="inspector-label">
                {labelText}
                {help && (
                    <Tooltip label={help} multiline w={260} withArrow position="bottom-end" events={{ hover: true, focus: true, touch: true }}>
                        <button type="button" className="inspector-help" aria-label={help}>
                            <IconHelpCircle size={15} />
                        </button>
                    </Tooltip>
                )}
            </div>
            {children}
        </div>
    );
}
