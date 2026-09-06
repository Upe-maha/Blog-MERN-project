import { create } from "zustand";
import { likeService } from "@/services/likeService";
import { getErrorMessage } from "@/lib/errorHandler";

export interface LikeEntry {
    likesCount: number;
    liked: boolean;
    pending: boolean;
}

const emptyEntry: LikeEntry = { likesCount: 0, liked: false, pending: false };

interface LikeState {
    // Keyed by blogId. The previous store was a singleton holding one post's count and liked flag,
    // so navigating from post A to post B showed A's numbers until B's fetch landed — and it is
    // why the old LikeButton (now deleted — see below) duplicated the whole thing in local
    // useState rather than using it.
    byBlog: Record<string, LikeEntry>;

    hydrate: (blogId: string, likesCount: number, liked: boolean) => void;
    syncMine: (blogId: string) => Promise<void>;
    toggle: (blogId: string) => Promise<string | null>;
}

export const useLikeStore = create<LikeState>((set, get) => {
    const entry = (blogId: string): LikeEntry => get().byBlog[blogId] ?? emptyEntry;

    const patch = (blogId: string, next: Partial<LikeEntry>) =>
        set((state) => ({
            byBlog: {
                ...state.byBlog,
                [blogId]: { ...(state.byBlog[blogId] ?? emptyEntry), ...next },
            },
        }));

    return {
        byBlog: {},

        // Seeds from a server-rendered payload. `liked` from such a payload is always false — the
        // page was fetched without a token — so syncMine corrects it for a signed-in reader.
        hydrate: (blogId, likesCount, liked) => patch(blogId, { likesCount, liked }),

        syncMine: async (blogId) => {
            try {
                const res = await likeService.getMine(blogId);
                patch(blogId, { liked: res.liked, likesCount: res.likesCount });
            } catch {
                // A failed sync leaves the seeded count in place, which is the honest fallback:
                // the count is right, only the viewer's own heart may be unfilled.
            }
        },

        // Returns an error message on failure, null on success, so the caller decides how to
        // surface it. Resolves immediately if a toggle for this post is already in flight, which is
        // what stops a double-click double-counting.
        toggle: async (blogId) => {
            const before = entry(blogId);
            if (before.pending) return null;

            // Optimistic: the heart fills on click, not on the round trip.
            patch(blogId, {
                liked: !before.liked,
                likesCount: Math.max(0, before.likesCount + (before.liked ? -1 : 1)),
                pending: true,
            });

            try {
                const res = await likeService.toggle(blogId);
                // Overwrite rather than keep the optimistic guess: the server's count includes
                // everyone else's likes since the page was rendered, so the local arithmetic is
                // only ever an approximation.
                patch(blogId, { liked: res.liked, likesCount: res.likesCount, pending: false });
                return null;
            } catch (err) {
                patch(blogId, { ...before, pending: false });
                return getErrorMessage(err, "Could not save that. Try again.");
            }
        },
    };
});

export { emptyEntry };
