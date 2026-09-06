import { create } from "zustand";
import type { BlogListItem, BlogListResponse } from "@/types";
import { blogService } from "@/services/blogService";
import { getErrorMessage } from "@/lib/errorHandler";

const PAGE_SIZE = 9;

interface BlogState {
    blogs: BlogListItem[];
    // The query the current list was fetched with. The feed compares it against the URL's ?q= to
    // decide whether it can reuse what it already has — which is what makes Back preserve every
    // appended page instead of snapping to page 1.
    query: string;
    author: string;
    page: number;
    total: number;
    hasMore: boolean;
    // The createdAt of the last row loaded. Null on a search, where the server orders by relevance
    // and a date cursor cannot seek into that ordering — those fall back to ?page=.
    cursor: string | null;
    isLoading: boolean;
    isFetchingMore: boolean;
    error: string | null;

    hydrate: (data: BlogListResponse, opts?: { query?: string; author?: string }) => void;
    reconcile: (rows: BlogListItem[]) => void;
    fetchBlogs: (opts?: { query?: string; author?: string; limit?: number }) => Promise<void>;
    fetchMoreBlogs: (limit?: number) => Promise<void>;
    removeBlog: (id: string) => void;
    clearError: () => void;
}

export const useBlogStore = create<BlogState>((set, get) => ({
    blogs: [],
    query: "",
    author: "",
    page: 1,
    total: 0,
    hasMore: false,
    cursor: null,
    isLoading: false,
    isFetchingMore: false,
    error: null,

    // The SSR handoff. The list page renders page 1 on the server; this seeds the store with it so
    // the browser never refetches what it was just sent.
    hydrate: (data, opts = {}) =>
        set({
            blogs: data.blogs ?? [],
            query: opts.query ?? "",
            author: opts.author ?? "",
            page: data.page ?? 1,
            total: data.total ?? 0,
            hasMore: data.hasMore ?? false,
            cursor: data.nextCursor ?? data.blogs?.at(-1)?.createdAt ?? null,
            isLoading: false,
            isFetchingMore: false,
            error: null,
        }),

    // The server's page 1 came back holding the same rows as the store, but with different numbers
    // on them — somebody liked or commented. Patch those rows where they sit instead of re-seeding:
    // hydrate() would drop every page the reader scrolled through to get here, and losing their
    // place is a worse outcome than a like count that is a minute stale. When the *set* of rows
    // changes — a post published or deleted — the feed calls hydrate() instead, because a new row
    // has to be able to enter the list and a deleted one has to be able to leave it.
    reconcile: (rows) =>
        set((state) => {
            const fresh = new Map(rows.map((r) => [r._id, r]));
            return { blogs: state.blogs.map((b) => fresh.get(b._id) ?? b) };
        }),

    // Resets the list. Used when the query changes, or on the browser when SSR data was unavailable.
    fetchBlogs: async ({ query = "", author = "", limit = PAGE_SIZE } = {}) => {
        set({ isLoading: true, error: null, query, author });
        try {
            const data: BlogListResponse = await blogService.getAll({
                page: 1,
                limit,
                q: query || undefined,
                author: author || undefined,
            });
            set({
                blogs: data.blogs ?? [],
                page: data.page ?? 1,
                total: data.total ?? 0,
                hasMore: data.hasMore ?? false,
                cursor: data.nextCursor ?? data.blogs?.at(-1)?.createdAt ?? null,
                isLoading: false,
            });
        } catch (err) {
            // getErrorMessage, not a hardcoded string: the server's message ("Too many requests",
            // "Validation failed") is far more useful than "Failed to fetch blogs".
            set({ error: getErrorMessage(err, "Could not load posts."), isLoading: false });
        }
    },

    fetchMoreBlogs: async (limit = PAGE_SIZE) => {
        const { hasMore, isFetchingMore, page, query, author, cursor } = get();
        if (!hasMore || isFetchingMore) return;

        set({ isFetchingMore: true, error: null });
        try {
            // A cursor when we have one and are not searching. `skip` re-walks every row already
            // shown — page 50 costs Mongo 441 documents to return 9 — and shifts by one whenever
            // somebody publishes mid-scroll, which duplicates a row or drops one entirely.
            const useCursor = !query && !!cursor;
            const data: BlogListResponse = await blogService.getAll({
                ...(useCursor ? { after: cursor } : { page: page + 1 }),
                limit,
                q: query || undefined,
                author: author || undefined,
            });
            set((state) => ({
                // Guard against a double-fire appending the same page twice.
                blogs: [
                    ...state.blogs,
                    ...(data.blogs ?? []).filter(
                        (b) => !state.blogs.some((existing) => existing._id === b._id)
                    ),
                ],
                page: data.page ?? state.page + 1,
                total: data.total ?? state.total,
                hasMore: data.hasMore ?? false,
                cursor: data.nextCursor ?? data.blogs?.at(-1)?.createdAt ?? state.cursor,
                isFetchingMore: false,
            }));
        } catch (err) {
            set({ error: getErrorMessage(err, "Could not load more posts."), isFetchingMore: false });
        }
    },

    // The delete request itself goes through blogService at the call site; this just drops the row
    // so the list doesn't keep rendering something that no longer exists.
    removeBlog: (id) =>
        set((state) => ({
            blogs: state.blogs.filter((b) => b._id !== id),
            total: Math.max(0, state.total - 1),
        })),

    clearError: () => set({ error: null }),
}));
