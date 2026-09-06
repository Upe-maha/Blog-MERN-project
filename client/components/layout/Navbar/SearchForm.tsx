"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import type { BlogSuggestion } from "@/types";
import { blogService } from "@/services/blogService";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Long enough that a debounce still feels instant, short enough that the API is not asked a
// question per keystroke. The server also caps and validates the term, because a public endpoint
// cannot rely on its client behaving.
const DEBOUNCE_MS = 180;
const MIN_CHARS = 2;

export function SearchForm({
    className,
    autoFocus,
    onNavigate,
}: {
    className?: string;
    autoFocus?: boolean;
    onNavigate?: () => void;
}) {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<BlogSuggestion[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    // -1 means "nothing highlighted", which is what makes Enter run the full search rather than
    // opening whichever post happened to be first.
    const [active, setActive] = useState(-1);

    const router = useRouter();
    const rootRef = useRef<HTMLDivElement | null>(null);
    const listId = useId();
    const optionId = (i: number) => `${listId}-option-${i}`;

    const term = query.trim();

    useEffect(() => {
        if (term.length < MIN_CHARS) {
            setSuggestions([]);
            setLoading(false);
            return;
        }

        // Abort rather than merely ignore: a stale request that is still open holds a connection
        // and, on a slow link, can resolve *after* a newer one and overwrite fresher results with
        // older ones. Cancelling makes that ordering impossible rather than unlikely.
        const controller = new AbortController();
        setLoading(true);

        const timer = setTimeout(async () => {
            try {
                const rows = await blogService.suggest(term, 6, controller.signal);
                setSuggestions(rows);
                setActive(-1);
            } catch {
                // A failed suggest is not worth a toast. The form still submits, which is the
                // thing the reader actually came here to do.
                setSuggestions([]);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [term]);

    // Pointer-down, not click: a click listener fires after the input has already blurred, which
    // on mobile leaves the panel open behind the keyboard dismissing.
    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: PointerEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    const go = (href: string) => {
        setOpen(false);
        setActive(-1);
        router.push(href);
        onNavigate?.();
    };

    const runSearch = () => go(term ? `/blogs?q=${encodeURIComponent(term)}` : "/blogs");

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        // A highlighted suggestion is a destination; anything else is a search.
        if (active >= 0 && suggestions[active]) go(`/blogs/${suggestions[active]._id}`);
        else runSearch();
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
            setOpen(false);
            setActive(-1);
            return;
        }
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        if (!suggestions.length) return;

        e.preventDefault();
        setOpen(true);
        // Wraps at both ends, and steps back through -1 so the reader can always get out of the
        // list and back to typing a plain search.
        setActive((i) => {
            const last = suggestions.length - 1;
            if (e.key === "ArrowDown") return i >= last ? -1 : i + 1;
            return i <= -1 ? last : i - 1;
        });
    };

    const showPanel = open && term.length >= MIN_CHARS;
    const hasResults = suggestions.length > 0;

    return (
        <div ref={rootRef} className={cn("relative", className)}>
            <form onSubmit={submit} role="search">
                <Search
                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                    aria-hidden="true"
                />
                <Input
                    type="search"
                    value={query}
                    autoFocus={autoFocus}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    placeholder="Search essays…"
                    aria-label="Search essays"
                    // The combobox pattern: the input owns the state, the listbox is referenced
                    // rather than focused, and aria-activedescendant is what tells a screen reader
                    // which option is highlighted while focus never leaves the field.
                    role="combobox"
                    aria-expanded={showPanel}
                    aria-controls={showPanel ? listId : undefined}
                    aria-activedescendant={active >= 0 ? optionId(active) : undefined}
                    aria-autocomplete="list"
                    autoComplete="off"
                    className="pl-9"
                />
                {loading ? (
                    <Loader2
                        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin"
                        aria-hidden="true"
                    />
                ) : null}
            </form>

            {showPanel ? (
                // Paper over the page, not floating chrome: a rule and a radius, no shadow —
                // DESIGN.md §27 and §29.
                <div className="bg-popover border-border absolute inset-x-0 top-full z-(--z-dropdown) mt-1.5 overflow-hidden rounded-lg border">
                    <ul id={listId} role="listbox" aria-label="Post suggestions">
                        {suggestions.map((s, i) => (
                            <li key={s._id} role="presentation">
                                <button
                                    type="button"
                                    id={optionId(i)}
                                    role="option"
                                    aria-selected={i === active}
                                    // The input keeps focus, so the highlight has to be driven by
                                    // `active` rather than :hover or :focus alone — otherwise
                                    // pointer and keyboard would disagree about what Enter does.
                                    onMouseEnter={() => setActive(i)}
                                    onClick={() => go(`/blogs/${s._id}`)}
                                    className={cn(
                                        "flex min-h-11 w-full items-center px-3 py-2 text-left transition-colors",
                                        i === active && "bg-surface-hover"
                                    )}
                                >
                                    <span className="font-serif truncate leading-snug">
                                        {s.title}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>

                    {!hasResults && !loading ? (
                        <p className="text-muted-foreground px-3 py-3 text-sm">
                            No titles match “{term}”.
                        </p>
                    ) : null}

                    {/* Always offered, results or not: the suggestions only cover titles, while
                        the search itself also reads post bodies, so "nothing here" is never the
                        same answer as "nothing anywhere". */}
                    <button
                        type="button"
                        onClick={runSearch}
                        className={cn(
                            "hover:bg-surface-hover flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                            hasResults && "border-border border-t"
                        )}
                    >
                        <Search className="size-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                            Search all posts for <span className="text-foreground">“{term}”</span>
                        </span>
                    </button>
                </div>
            ) : null}
        </div>
    );
}
