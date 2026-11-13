import { ReactNode } from "react";

interface PageHeaderProps
{
    title: string;
    intro: ReactNode;
}

// Title and one-line introduction at the top of a settings page.
export function PageHeader({ title, intro }: PageHeaderProps)
{
    return (
        <div className="page-header">
            <div>
                <h1 className="page-title">{title}</h1>
                <p className="page-intro">{intro}</p>
            </div>
        </div>
    );
}
