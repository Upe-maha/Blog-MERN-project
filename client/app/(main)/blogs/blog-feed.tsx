"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { FileText, Loader2, SearchX } from "lucide-react";
import type { BlogListItem, BlogListResponse } from "@/types";
import { useBlogStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import PostRow from "@/components/blog/PostRow";

// Which rows the server says are on page 1, and what they currently say. Split in two because the
// two answers deserve different treatment: a changed *set* of ids means a post was published or
// deleted and the list has to be rebuilt, while the same ids carrying different numbers only means
// somebody liked or commented, which can be patched in place without costing the reader their
// scroll position.
const rowIds = (rows: BlogListItem[]) => rows.map((b) => b._id).join(",");

const rowContent = (rows: BlogListItem[]) =>
    rows
        .map((b) => `${b._id}:${b.likesCount}:${b.commentsCount}:${b.title}:${b.updatedAt}`)
        .join("|");

export function BlogFeed({
    initial,
    query,
}: {
    initial: BlogListResponse | null;
    query: string;
}) {
    const {
        blogs: storeBlogs,
        query: storeQuery,
        hasMore: storeHasMore,
        isFetchingMore,
        isLoading,
        error,
        page,
        hydrate,
        reconcile,
        fetchBlogs,
        fetchMoreBlogs,
    } = useBlogStore();

    // The store is empty during SSR — hydrate() runs in an effect, and effects do not run on the
    // server — so rendering straight from it emitted the "Nothing published yet" empty state into
    // the HTML for every crawler and every cold visitor, with the real posts arriving only after
    // hydration. Read `initial` until the store has genuinely taken over for this query.
    const storeOwnsList = storeQuery === query && storeBlogs.length > 0;
    const blogs = storeOwnsList ? storeBlogs : (initial?.blogs ?? []);
    const hasMore = storeOwnsList ? storeHasMore : (initial?.hasMore ?? false);

    const sentinelRef = useRef<HTMLDivElement | null>(null);
    // What page 1 looked like the last time we took the server's word for it. Compared against the
    // incoming payload to tell a genuine update apart from the same answer arriving again.
    const seeded = useRef<{ ids: string; content: string } | null>(null);

    useEffect(() => {
        const state = useBlogStore.getState();
        const rows = initial?.blogs ?? [];
        const ids = rowIds(rows);
        const content = rowContent(rows);

        // The store already holds this query's results, including every page the reader scrolled
        // to. That used to be reason enough to ignore `initial` entirely — and it is what made
        // every mutation invisible until a full reload. app/actions.ts drops the cache tag after a
        // publish, delete, like or comment and router.refresh() re-runs this page, so `initial`
        // arrives genuinely newer than the store; bailing out threw that away and re-rendered the
        // stale list. The store is not persisted, so reloading was the only thing that cleared it.
        const storeOwns = state.query === query && state.blogs.length > 0;

        if (!initial) {
            // Server fetch failed (API asleep or unreachable) — retry from the browser, unless the
            // store already has something worth showing.
            if (!storeOwns) void fetchBlogs({ query });
            return;
        }

        // Nothing the store is showing has changed: this is Back, or a re-render with the same
        // payload. Keep the appended pages.
        if (storeOwns && seeded.current?.content === content) return;

        seeded.current = { ids, content };

        // Same rows, different numbers — patch them where they are rather than snapping the reader
        // back to page 1 over a like count.
        if (storeOwns && ids === rowIds(state.blogs.slice(0, rows.length))) {
            reconcile(rows);
            return;
        }

        hydrate(initial, { query });
    }, [initial, query, hydrate, reconcile, fetchBlogs]);

    // Re-created whenever the page changes so the observer re-attaches. If the sentinel is already
    // on screen at that moment the browser fires immediately, which covers a short list that never
    // pushes the sentinel out of the viewport.
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries[0].isIntersecting) return;
                // Read fresh state rather than the values closed over at creation time.
                const state = useBlogStore.getState();
                if (state.hasMore && !state.isFetchingMore) void state.fetchMoreBlogs();
            },
            { rootMargin: "400px" }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [page, fetchMoreBlogs]);

    const isEmpty = !isLoading && blogs.length === 0;

    return (
        <div>
            {error ? (
                <p
                    role="alert"
                    className="border-destructive text-destructive mb-6 border-l-2 py-0.5 pl-3 text-sm"
                >
                    {error}
                </p>
            ) : null}

            {isEmpty ? (
                query ? (
                    <EmptyState
                        icon={SearchX}
                        title={`Nothing matches “${query}”`}
                        description="Search covers every post, not just the ones already loaded — so try a different word."
                        action={
                            <Button variant="ghost" render={<Link href="/blogs" />}>
                                Clear search
                            </Button>
                        }
                    />
                ) : (
                    <EmptyState
                        icon={FileText}
                        title="Nothing published yet"
                        description="The first post will appear here once it's written."
                        action={
                            <Button render={<Link href="/blogs/create" />}>Write the first one</Button>
                        }
                    />
                )
            ) : (
                <div className="border-border border-t">
                    {blogs.map((blog) => (
                        <PostRow key={blog._id} blog={blog} />
                    ))}
                </div>
            )}

            {/* Always mounted, whatever the list state, so the observer always has a target. */}
            <div ref={sentinelRef} className="h-px" aria-hidden="true" />

            {isFetchingMore ? (
                <p className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Loading more
                </p>
            ) : null}

            {!hasMore && blogs.length > 0 ? (
                <p className="text-muted-foreground py-8 text-center text-[0.8125rem] tracking-[0.06em] uppercase">
                    End of the archive
                </p>
            ) : null}
        </div>
    );
}

export default BlogFeed;
