import { create } from "zustand";
import { Blog } from "@/types";
import { blogService } from "@/services/blogService";

interface BlogState {
    blogs: Blog[];
    currentBlog: Blog | null;
    isLoading: boolean;
    isFetchingMore: boolean; // true only when loading additional pages (not the first)
    hasMore: boolean;        // false when currentPage === totalPages
    currentPage: number;
    totalPages: number;
    error: string | null;

    // Actions
    fetchBlogs: (page?: number, limit?: number) => Promise<void>;
    fetchMoreBlogs: (limit?: number) => Promise<void>;
    fetchBlogById: (id: string) => Promise<void>;
    createBlog: (formData: FormData) => Promise<Blog | null>;
    updateBlog: (id: string, formData: FormData) => Promise<void>;
    deleteBlog: (id: string) => Promise<void>;
    clearCurrentBlog: () => void;
    clearError: () => void;
}

export const useBlogStore = create<BlogState>((set, get) => ({
    blogs: [],
    currentBlog: null,
    isLoading: false,
    isFetchingMore: false,
    hasMore: false,   // stays false until fetchBlogs resolves and confirms more pages exist
    currentPage: 1,
    totalPages: 1,
    error: null,

    // Resets blogs and fetches from page 1 (used on initial load / search reset)
    fetchBlogs: async (page = 1, limit = 5) => {
        set({ isLoading: true, error: null });
        try {
            const response = await blogService.getAll(page, limit);
            set({
                blogs: response.blogs || [],
                currentPage: response.currentPage,
                totalPages: response.totalPages,
                hasMore: response.currentPage < response.totalPages,
                isLoading: false,
            });
        } catch {
            set({ error: "Failed to fetch blogs", isLoading: false });
        }
    },

    // Appends the next page to the existing blog list (used by infinite scroll)
    fetchMoreBlogs: async (limit = 5) => {
        const { currentPage, totalPages, isFetchingMore } = get();

        // Guard: don't fetch if already loading or no more pages
        if (isFetchingMore || currentPage >= totalPages) return;

        const nextPage = currentPage + 1;
        set({ isFetchingMore: true, error: null });
        try {
            const response = await blogService.getAll(nextPage, limit);
            set((state) => ({
                blogs: [...state.blogs, ...(response.blogs || [])],
                currentPage: response.currentPage,
                totalPages: response.totalPages,
                hasMore: response.currentPage < response.totalPages,
                isFetchingMore: false,
            }));
        } catch {
            set({ error: "Failed to load more blogs", isFetchingMore: false });
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
