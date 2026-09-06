"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// One request per pause in typing, not one per keystroke. Each admin list search is a regex scan
// or a text search over the whole collection, so an undebounced input was a self-inflicted load
// test at roughly ten queries a second.
export function SearchInput({
    value,
    onChange,
    label,
    placeholder,
    delay = 300,
}: {
    value: string;
    onChange: (q: string) => void;
    label: string;
    placeholder: string;
    delay?: number;
}) {
    const [draft, setDraft] = useState(value);
    const [seeded, setSeeded] = useState(value);

    // Re-seeded when the committed value changes from outside (a cleared search, a tab switch),
    // so the box never shows a query the list is not actually filtered by. Adjusted during render
    // rather than in an effect: setting state synchronously in an effect renders twice and the
    // compiler flags it. React re-runs this component immediately, before touching the DOM.
    if (seeded !== value) {
        setSeeded(value);
        setDraft(value);
    }

    useEffect(() => {
        if (draft === value) return;
        const id = setTimeout(() => onChange(draft), delay);
        return () => clearTimeout(id);
    }, [draft, value, delay, onChange]);

    return (
        <div className="relative flex-1 sm:max-w-xs">
            <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                aria-hidden="true"
            />
            <Input
                type="search"
                aria-label={label}
                placeholder={placeholder}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="pl-8"
            />
        </div>
    );
}

// A <select> rather than a menu of buttons: it is a single choice from a short list, which is
// exactly what the native control is for — and it is keyboard- and screen-reader-correct with no
// work from us.
export function SortSelect<T extends string>({
    value,
    onChange,
    options,
    label,
}: {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
    label: string;
}) {
    return (
        <select
            aria-label={label}
            value={value}
            onChange={(e) => onChange(e.target.value as T)}
            className="border-input bg-transparent text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border px-2 text-sm transition-colors outline-none focus-visible:ring-3 dark:bg-input/30"
        >
            {options.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    );
}

export function Pagination({
    page,
    total,
    limit,
    hasMore,
    loading,
    onPage,
}: {
    page: number;
    total: number;
    limit: number;
    hasMore: boolean;
    loading: boolean;
    onPage: (p: number) => void;
}) {
    const pages = Math.max(1, Math.ceil(total / limit));
    if (total === 0) return null;

    const first = (page - 1) * limit + 1;
    const last = Math.min(page * limit, total);

    return (
        <div className="border-border mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-muted-foreground text-[0.8125rem] tracking-[0.06em] tabular-nums">
                {first}–{last} of {total}
            </p>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => onPage(page - 1)}
                >
                    Previous
                </Button>
                <span className="text-muted-foreground px-2 text-sm tabular-nums">
                    {page} / {pages}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasMore || loading}
                    onClick={() => onPage(page + 1)}
                >
                    {loading ? <Loader2 className="animate-spin" /> : null}
                    Next
                </Button>
            </div>
        </div>
    );
}
