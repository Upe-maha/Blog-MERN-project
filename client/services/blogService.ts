import apiClient, { getImageUrl } from "@/lib/api";
import type { Blog, BlogListResponse, BlogSuggestion } from "@/types";

export { getImageUrl };

export const blogService = {
    create: async (formData: FormData) => {
        const response = await apiClient.post<{ message: string; blog: Blog }>("/blogs", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    // `q` and `author` are honoured by the server now — the list page used to filter the pages it
    // already had in memory, so searching for a post on page 5 reported "no results".
    getAll: async (
        params: {
            page?: number;
            limit?: number;
            q?: string;
            author?: string;
            // ISO date of the last row already rendered. Mutually exclusive with `page`.
            after?: string;
        } = {}
    ) => {
        const response = await apiClient.get<BlogListResponse>("/blogs", {
            params: { page: 1, limit: 9, ...params },
        });
        return response.data;
    },

    // The search box's autocomplete. A dedicated endpoint rather than getAll with a small limit:
    // that would run the whole enrichment pipeline — author lookup, counts, excerpt stripping — to
    // render six titles, on every keystroke that survives the debounce.
    suggest: async (q: string, limit = 6, signal?: AbortSignal) => {
        const response = await apiClient.get<{ suggestions: BlogSuggestion[] }>("/blogs/suggest", {
            params: { q, limit },
            signal,
        });
        return response.data.suggestions;
    },

    getById: async (id: string) => {
        const response = await apiClient.get<{ blog: Blog }>(`/blogs/${id}`);
        return response.data;
    },


    update: async (id: string, formData: FormData) => {
        const response = await apiClient.put<{ message: string; blog: Blog }>(`/blogs/${id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete(`/blogs/${id}`);
        return response.data;
    },
};
