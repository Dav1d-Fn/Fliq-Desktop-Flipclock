import { ReactNode } from "react";

interface InspectorFieldProps
{
    label: string;
    // Id of the input the label belongs to; left out for groups of buttons.
    htmlFor?: string;
    children: ReactNode;
}

// One labelled setting in the inspector column.
export function InspectorField({ label, htmlFor, children }: InspectorFieldProps)
{
    return (
        <div className="inspector-field">
            {htmlFor ? <label className="inspector-label" htmlFor={htmlFor}>{label}</label> : <div className="inspector-label">{label}</div>}
            {children}
        </div>
    );
}
