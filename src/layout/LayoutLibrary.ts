import type { ClockLayout } from "./ClockLayout";

// A named copy of the whole grid and its blocks (ATOMS.SAVED_LAYOUTS).
export interface SavedLayout
{
    id: number;
    name: string;
    layout: ClockLayout;
}

export interface LibraryChange
{
    layouts: SavedLayout[];
    // The layout that was added.
    id: number;
}

// JSON with sorted keys, so two layouts that differ only in key order count as the same.
function canonical(value: unknown): string
{
    return JSON.stringify(value, (_key, inner: unknown) =>
    {
        if (inner && typeof inner === "object" && !Array.isArray(inner))
        {
            const entries = Object.entries(inner as Record<string, unknown>).sort(([first], [second]) => first.localeCompare(second));
            return Object.fromEntries(entries);
        }
        return inner;
    });
}

// The saved layouts: add, overwrite, rename, duplicate, remove. Pure; every change returns a
// new list for the atom.
export class LayoutLibrary
{
    readonly layouts: SavedLayout[];

    constructor(layouts: SavedLayout[])
    {
        this.layouts = layouts;
    }

    static sameLayout(first: ClockLayout, second: ClockLayout): boolean
    {
        return canonical(first) === canonical(second);
    }

    find(id: number | null): SavedLayout | undefined
    {
        return this.layouts.find((saved) => saved.id === id);
    }

    // True when `layout` differs from the saved layout `id` (or there is no such layout).
    hasChanges(id: number | null, layout: ClockLayout): boolean
    {
        const saved = this.find(id);
        return !saved || !LayoutLibrary.sameLayout(saved.layout, layout);
    }

    // `name`, or "name 2", "name 3"… when a layout already has it.
    uniqueName(name: string): string
    {
        const trimmed = name.trim();
        const taken = new Set(this.layouts.map((saved) => saved.name));
        if (!taken.has(trimmed))
        {
            return trimmed;
        }
        let number = 2;
        while (taken.has(`${trimmed} ${number}`))
        {
            number++;
        }
        return `${trimmed} ${number}`;
    }

    withNew(name: string, layout: ClockLayout): LibraryChange
    {
        const id = this.layouts.reduce((highest, saved) => Math.max(highest, saved.id), 0) + 1;
        return { layouts: [...this.layouts, { id, name: this.uniqueName(name), layout }], id };
    }

    withSaved(id: number, layout: ClockLayout): SavedLayout[]
    {
        return this.layouts.map((saved) => (saved.id === id ? { ...saved, layout } : saved));
    }

    // Empty names keep the old one.
    withRenamed(id: number, name: string): SavedLayout[]
    {
        const saved = this.find(id);
        if (!saved || !name.trim() || name.trim() === saved.name)
        {
            return this.layouts;
        }
        const others = new LayoutLibrary(this.layouts.filter((other) => other.id !== id));
        const unique = others.uniqueName(name);
        return this.layouts.map((other) => (other.id === id ? { ...other, name: unique } : other));
    }

    withDuplicate(id: number, name: string): LibraryChange | null
    {
        const saved = this.find(id);
        return saved ? this.withNew(name, saved.layout) : null;
    }

    without(id: number): SavedLayout[]
    {
        return this.layouts.filter((saved) => saved.id !== id);
    }
}
