import { ReactNode } from "react";

interface InspectorGroupProps
{
    children: ReactNode;
}

// Settings that belong together (a choice and the settings that only act through it, or one
// family like the analog colors), framed so the inspector shows at a glance what goes with what.
export function InspectorGroup({ children }: InspectorGroupProps)
{
    return <div className="inspector-group">{children}</div>;
}
