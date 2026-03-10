import apiClient from "@/lib/api";

export const commentService = {
    add: async (data: { blogId: string; userId: string; content: string }) => {
        const response = await apiClient.post("/comments", data);
        return response.data;
    },

    getByBlog: async (blogId: string) => {
        const response = await apiClient.get(`/comments/blog/${blogId}`);
        return response.data;
    },

    update: async (id: string, data: { content: string }) => {
        const response = await apiClient.put(`/comments/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete(`/comments/${id}`);
        return response.data;
    },
};
