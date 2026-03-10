import { create } from "zustand";
import { likeService } from "@/services/blogService";

interface LikeState {
    likesCount: number;
    isLiked: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    checkUserLike: (blogId: string, userId: string) => Promise<void>;
    likeBlog: (blogId: string, userId: string) => Promise<void>;
    unlikeBlog: (blogId: string, userId: string) => Promise<void>;
    setLikesCount: (count: number) => void;
    clearError: () => void;
}

export const useLikeStore = create<LikeState>((set) => ({
    likesCount: 0,
    isLiked: false,
    isLoading: false,
    error: null,

    checkUserLike: async (blogId, userId) => {
        try {
            const response = await likeService.checkUserLike(blogId, userId);
            set({ isLiked: response.liked });
        } catch (error) {
            console.error("Check like error:", error);
        }
    },

    likeBlog: async (blogId, userId) => {
        set({ isLoading: true, error: null });
        try {
            await likeService.like({ blogId, userId });
            set((state) => ({
                isLiked: true,
                likesCount: state.likesCount + 1,
                isLoading: false,
            }));
        } catch {
            set({ error: "Failed to like blog", isLoading: false });
        }
    },

    unlikeBlog: async (blogId, userId) => {
        set({ isLoading: true, error: null });
        try {
            await likeService.unlike({ blogId, userId });
            set((state) => ({
                isLiked: false,
                likesCount: state.likesCount - 1,
                isLoading: false,
            }));
        } catch {
            set({ error: "Failed to unlike blog", isLoading: false });
        }
    },

    setLikesCount: (count) => set({ likesCount: count }),

    clearError: () => set({ error: null }),
}));
