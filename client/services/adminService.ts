import apiClient from "@/lib/api";

export const adminService = {
    // Users
    getUsers: async () => {
        const response = await apiClient.get("/admin/users");
        return response.data;
    },

    toggleBlockUser: async (userId: string) => {
        const response = await apiClient.patch(`/admin/users/${userId}/block`);
        return response.data;
    },

    deleteUser: async (userId: string) => {
        const response = await apiClient.delete(`/admin/users/${userId}`);
        return response.data;
    },

    // Blogs
    getBlogs: async () => {
        const response = await apiClient.get("/admin/blogs");
        return response.data;
    },

    deleteBlog: async (blogId: string) => {
        const response = await apiClient.delete(`/admin/blogs/${blogId}`);
        return response.data;
    },
};
