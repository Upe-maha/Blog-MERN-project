"use client";

import { useBlogStore } from "@/stores/blogStore";

export function useBlogs() {
    const {
        blogs,
        currentBlog,
        isLoading,
        error,
        fetchBlogs,
        fetchBlogById,
        createBlog,
        updateBlog,
        deleteBlog,
        clearCurrentBlog,
        clearError,
    } = useBlogStore();

    return {
        blogs,
        currentBlog,
        isLoading,
        error,
        fetchBlogs,
        fetchBlogById,
        createBlog,
        updateBlog,
        deleteBlog,
        clearCurrentBlog,
        clearError,
    };
}

