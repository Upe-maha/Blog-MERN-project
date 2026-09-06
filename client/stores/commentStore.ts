import { create } from "zustand";
import type { Comment, PublicAuthor } from "@/types";
import { commentService } from "@/services/commentService";
import { getErrorMessage } from "@/lib/errorHandler";

const PAGE_SIZE = 20;

export interface CommentThread {
    items: Comment[];
    total: number;
    page: number;
    hasMore: boolean;
    isLoading: boolean;
    isFetchingMore: boolean;
    error: string | null;
}

const emptyThread: CommentThread = {
    items: [],
    total: 0,
    page: 0,
    hasMore: false,
    isLoading: false,
    isFetchingMore: false,
    error: null,
};

interface CommentState {
    // Keyed by blogId rather than a single flat list. The old shape meant navigating between two
    // posts showed the previous post's comments until the refetch landed, and made the unmount
    // cleanup load-bearing.
    byBlog: Record<string, CommentThread>;

    fetchComments: (blogId: string) => Promise<void>;
    fetchMoreComments: (blogId: string) => Promise<void>;
    addComment: (blogId: string, content: string, author: PublicAuthor) => Promise<boolean>;
    updateComment: (blogId: string, id: string, content: string) => Promise<boolean>;
    deleteComment: (blogId: string, id: string) => Promise<boolean>;
    clearError: (blogId: string) => void;
}

export const useCommentStore = create<CommentState>((set, get) => {
    const thread = (blogId: string): CommentThread => get().byBlog[blogId] ?? emptyThread;

    const patch = (blogId: string, next: Partial<CommentThread>) =>
        set((state) => ({
            byBlog: {
                ...state.byBlog,
                [blogId]: { ...(state.byBlog[blogId] ?? emptyThread), ...next },
            },
        }));

    return {
        byBlog: {},

        fetchComments: async (blogId) => {
            patch(blogId, { isLoading: true, error: null });
            try {
                const res = await commentService.getByBlog(blogId, { page: 1, limit: PAGE_SIZE });
                patch(blogId, {
                    items: res.comments,
                    total: res.total,
                    page: res.page,
                    hasMore: res.hasMore,
                    isLoading: false,
                });
            } catch (err) {
                patch(blogId, {
                    isLoading: false,
                    error: getErrorMessage(err, "Could not load the comments."),
                });
            }
        },

        fetchMoreComments: async (blogId) => {
            const current = thread(blogId);
            if (current.isFetchingMore || !current.hasMore) return;

            patch(blogId, { isFetchingMore: true });
            try {
                const res = await commentService.getByBlog(blogId, {
                    page: current.page + 1,
                    limit: PAGE_SIZE,
                });
                // Dedupe by id: a comment posted between the two page requests shifts everything
                // down by one, which would otherwise render the boundary comment twice.
                const seen = new Set(current.items.map((c) => c._id));
                patch(blogId, {
                    items: [...current.items, ...res.comments.filter((c) => !seen.has(c._id))],
                    total: res.total,
                    page: res.page,
                    hasMore: res.hasMore,
                    isFetchingMore: false,
                });
            } catch (err) {
                patch(blogId, {
                    isFetchingMore: false,
                    error: getErrorMessage(err, "Could not load more comments."),
                });
            }
        },

        // Optimistic: the row appears immediately under a temporary id and is swapped for the
        // server's populated document on success, or removed on failure. Worth the bookkeeping
        // because the API is on Render's free tier, where a cold request can take tens of seconds.
        //
        // Returns whether it succeeded, so the caller knows whether to clear its textarea.
        addComment: async (blogId, content, author) => {
            const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const now = new Date().toISOString();
            const optimistic: Comment = {
                _id: tempId,
                blog: blogId,
                user: author,
                content,
                createdAt: now,
                updatedAt: now,
            };

            const before = thread(blogId);
            patch(blogId, {
                items: [optimistic, ...before.items],
                total: before.total + 1,
                error: null,
            });

            try {
                const res = await commentService.add(blogId, { content });
                // Read the thread again rather than reusing `before`: another comment may have
                // arrived, or one been deleted, while this request was in flight.
                patch(blogId, {
                    items: thread(blogId).items.map((c) => (c._id === tempId ? res.comment : c)),
                });
                return true;
            } catch (err) {
                const current = thread(blogId);
                patch(blogId, {
                    items: current.items.filter((c) => c._id !== tempId),
                    total: Math.max(0, current.total - 1),
                    error: getErrorMessage(err, "Could not post your comment."),
                });
                return false;
            }
        },

        updateComment: async (blogId, id, content) => {
            try {
                const res = await commentService.update(id, { content });
                patch(blogId, {
                    items: thread(blogId).items.map((c) => (c._id === id ? res.comment : c)),
                    error: null,
                });
                return true;
            } catch (err) {
                patch(blogId, { error: getErrorMessage(err, "Could not save your edit.") });
                return false;
            }
        },

        deleteComment: async (blogId, id) => {
            const current = thread(blogId);
            try {
                await commentService.delete(id);
                patch(blogId, {
                    items: current.items.filter((c) => c._id !== id),
                    total: Math.max(0, current.total - 1),
                    error: null,
                });
                return true;
            } catch (err) {
                patch(blogId, { error: getErrorMessage(err, "Could not delete the comment.") });
                return false;
            }
        },

        clearError: (blogId) => patch(blogId, { error: null }),
    };
});

export { emptyThread };
