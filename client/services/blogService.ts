import apiClient, { getImageUrl } from "@/lib/api";

export { getImageUrl };

export const blogService = {
    create: async (formData: FormData) => {
        const response = await apiClient.post("/blogs", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    getAll: async (page: number = 1, limit: number = 5) => {
        const response = await apiClient.get("/blogs", {
            params: { page, limit },
        });

        return response.data;
    },

    getById: async (id: string) => {
        const response = await apiClient.get(`/blogs/${id}`);
        return response.data;
    },

    getByUser: async (userId: string) => {
        const response = await apiClient.get(`/blogs/user/${userId}`);
        return response.data;
    },

    update: async (id: string, formData: FormData) => {
        const response = await apiClient.put(`/blogs/${id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete(`/blogs/${id}`);
        return response.data;
    },
};

export const likeService = {
    like: async (data: { blogId: string; userId: string }) => {
        const response = await apiClient.post("/likes", data);
        return response.data;
    },

    unlike: async (data: { blogId: string; userId: string }) => {
        const response = await apiClient.post("/likes/unlike", data);
        return response.data;
    },

    getByBlog: async (blogId: string) => {
        const response = await apiClient.get(`/likes/blog/${blogId}`);
        return response.data;
    },

    checkUserLike: async (blogId: string, userId: string) => {
        const response = await apiClient.get(`/likes/check/${blogId}/${userId}`);
        return response.data;
    },
};
