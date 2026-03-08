import { create } from "zustand";
import { Comment } from "@/types";
import { commentAPI } from "@/lib/api";

interface CommentState {
    comments: Comment[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchCommentsByBlog: (blogId: string) => Promise<void>;
    addComment: (data: { blogId: string; userId: string; content: string }) => Promise<void>;
    deleteComment: (id: string) => Promise<void>;
    clearComments: () => void;
    clearError: () => void;
}

export const useCommentStore = create<CommentState>((set) => ({
    comments: [],
    isLoading: false,
    error: null,

    fetchCommentsByBlog: async (blogId) => {
        set({ isLoading: true, error: null });
        try {
            const response = await commentAPI.getByBlog(blogId);
            set({ comments: response.comments || [], isLoading: false });
        } catch (error) {
            set({ error: "Failed to fetch comments", isLoading: false });
        }
    },

    addComment: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const response = await commentAPI.add(data);
            if (response.comment) {
                set((state) => ({
                    comments: [response.comment, ...state.comments],
                    isLoading: false,
                }));
            }
        } catch (error) {
            set({ error: "Failed to add comment", isLoading: false });
        }
    },

    deleteComment: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await commentAPI.delete(id);
            set((state) => ({
                comments: state.comments.filter((comment) => comment._id !== id),
                isLoading: false,
            }));
        } catch (error) {
            set({ error: "Failed to delete comment", isLoading: false });
        }
    },

    clearComments: () => set({ comments: [] }),

    clearError: () => set({ error: null }),
}));