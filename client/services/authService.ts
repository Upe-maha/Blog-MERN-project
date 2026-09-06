import apiClient from "@/lib/api";

export const authService = {
    register: async (formData: FormData) => {
        const response = await apiClient.post("/users", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    // Whether the app still has no administrator. Drives the first-run setup option on the
    // register form; the server decides whether a claim is actually granted.
    getBootstrapStatus: async () => {
        const response = await apiClient.get<{ adminExists: boolean }>("/users/bootstrap-status");
        return response.data;
    },

    login: async (data: { email: string; password: string }) => {
        const response = await apiClient.post("/users/login", data);
        return response.data;
    },

    // The account's own record, resolved from the token server-side. There is no getAll(): the
    // old GET /users returned every user's email to anonymous callers and has been removed.
    getMe: async () => {
        const response = await apiClient.get("/users/me");
        return response.data;
    },

    // Real counts across all three collections, not the length of one fetched page.
    getMyStats: async () => {
        const response = await apiClient.get<{
            blogs: number;
            comments: number;
            likesReceived: number;
        }>("/users/me/stats");
        return response.data;
    },

    // Public profile — username, avatar and join date only.
    getById: async (id: string) => {
        const response = await apiClient.get(`/users/${id}`);
        return response.data;
    },

    // No id parameter by design: the server takes identity from the JWT, so there is no way to
    // aim this at somebody else's account.
    updateMe: async (formData: FormData) => {
        const response = await apiClient.patch("/users/me", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    // No id here either — the account is the one the token names. Comes back with a replacement
    // token: the change retires every session issued before it, this one included, so the caller
    // must store what it returns or it has just signed itself out.
    changePassword: async (data: { currentPassword: string; newPassword: string }) => {
        const response = await apiClient.patch<{ message: string; token: string }>(
            "/users/me/password",
            data
        );
        return response.data;
    },

    deleteMe: async () => {
        const response = await apiClient.delete("/users/me");
        return response.data;
    },
};
