import apiClient from "@/lib/api";
import type { Comment } from "@/types";

export interface CommentListResponse {
    comments: Comment[];
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
}

// No userId anywhere in this file: the server reads the commenter from the verified token and the
// target blog from the URL. A client that still passes one would simply have it stripped.
export const commentService = {
    getByBlog: async (blogId: string, params?: { page?: number; limit?: number }) => {
        const response = await apiClient.get<CommentListResponse>(`/comments/blog/${blogId}`, {
            params,
        });
        return response.data;
    },

    add: async (blogId: string, data: { content: string }) => {
        const response = await apiClient.post<{ message: string; comment: Comment }>(
            `/comments/blog/${blogId}`,
            data
        );
        return response.data;
    },

    // PATCH, matching the route. The API existed all along; no client ever called it.
    update: async (id: string, data: { content: string }) => {
        const response = await apiClient.patch<{ message: string; comment: Comment }>(
            `/comments/${id}`,
            data
        );
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete<{ message: string }>(`/comments/${id}`);
        return response.data;
    },
};
