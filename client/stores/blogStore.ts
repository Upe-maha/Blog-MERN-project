import { create } from "zustand";
import { Blog } from "@/types";
import { blogService } from "@/services/blogService";

interface BlogState {
    blogs: Blog[];
    currentBlog: Blog | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchBlogs: () => Promise<void>;
    fetchBlogById: (id: string) => Promise<void>;
    createBlog: (formData: FormData) => Promise<Blog | null>;
    updateBlog: (id: string, formData: FormData) => Promise<void>;
    deleteBlog: (id: string) => Promise<void>;
    clearCurrentBlog: () => void;
    clearError: () => void;
}

export const useBlogStore = create<BlogState>((set) => ({
    blogs: [],
    currentBlog: null,
    isLoading: false,
    error: null,

    fetchBlogs: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await blogService.getAll();
            set({ blogs: response.blogs || [], isLoading: false });
        } catch {
            set({ error: "Failed to fetch blogs", isLoading: false });
        }
    },

    fetchBlogById: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const response = await blogService.getById(id);
            set({ currentBlog: response.blog, isLoading: false });
        } catch {
            set({ error: "Failed to fetch blog", isLoading: false });
        }
    },

    createBlog: async (formData) => {
        set({ isLoading: true, error: null });
        try {
            const response = await blogService.create(formData);
            if (response.blog) {
                set((state) => ({
                    blogs: [response.blog, ...state.blogs],
                    isLoading: false,
                }));
                return response.blog;
            }
            set({ error: response.message, isLoading: false });
            return null;
        } catch {
            set({ error: "Failed to create blog", isLoading: false });
            return null;
        }
    },

    updateBlog: async (id, formData) => {
        set({ isLoading: true, error: null });
        try {
            const response = await blogService.update(id, formData);
            if (response.blog) {
                set((state) => ({
                    blogs: state.blogs.map((blog) =>
                        blog._id === id ? response.blog : blog
                    ),
                    currentBlog: response.blog,
                    isLoading: false,
                }));
            }
        } catch {
            set({ error: "Failed to update blog", isLoading: false });
        }
    },

    deleteBlog: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await blogService.delete(id);
            set((state) => ({
                blogs: state.blogs.filter((blog) => blog._id !== id),
                isLoading: false,
            }));
        } catch {
            set({ error: "Failed to delete blog", isLoading: false });
        }
    },

    clearCurrentBlog: () => set({ currentBlog: null }),

    clearError: () => set({ error: null }),
}));
