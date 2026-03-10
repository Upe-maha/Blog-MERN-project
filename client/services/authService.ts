import apiClient from "@/lib/api";

export const authService = {
    register: async (formData: FormData) => {
        const response = await apiClient.post("/users", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    login: async (data: { email: string; password: string }) => {
        const response = await apiClient.post("/users/login", data);
        return response.data;
    },

    getAll: async () => {
        const response = await apiClient.get("/users");
        return response.data;
    },

    getById: async (id: string) => {
        const response = await apiClient.get(`/users/${id}`);
        return response.data;
    },

    update: async (id: string, formData: FormData) => {
        const response = await apiClient.put(`/users/${id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete(`/users/${id}`);
        return response.data;
    },
};
