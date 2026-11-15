import { Component, type ReactNode } from "react";

interface ThumbnailBoundaryProps
{
    fallback: ReactNode;
    children: ReactNode;
}

interface ThumbnailBoundaryState
{
    failed: boolean;
}

// Shows `fallback` instead of a thumbnail that threw while drawing, so one broken saved
// layout does not take the whole page with it. Error boundaries have to be classes.
export class ThumbnailBoundary extends Component<ThumbnailBoundaryProps, ThumbnailBoundaryState>
{
    state: ThumbnailBoundaryState = { failed: false };

    static getDerivedStateFromError(): ThumbnailBoundaryState
    {
        return { failed: true };
    }

    render(): ReactNode
    {
        return this.state.failed ? this.props.fallback : this.props.children;
    }
}
