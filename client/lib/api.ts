const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000";

// Helper to get full image URL
export const getImageUrl = (path: string | undefined): string => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${BASE_URL}${path}`;
};

// User API
export const userAPI = {
    register: async (formData: FormData) => {
        const res = await fetch(`${API_URL}/users`, {
            method: "POST",
            body: formData, // FormData for file upload
        });
        return res.json();
    },

    login: async (data: { email: string; password: string }) => {
        const res = await fetch(`${API_URL}/users/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        return res.json();
    },

    getAll: async () => {
        const res = await fetch(`${API_URL}/users`);
        return res.json();
    },

    getById: async (id: string) => {
        const res = await fetch(`${API_URL}/users/${id}`);
        return res.json();
    },

    update: async (id: string, formData: FormData) => {
        const res = await fetch(`${API_URL}/users/${id}`, {
            method: "PUT",
            body: formData, // FormData for file upload
        });
        return res.json();
    },

    delete: async (id: string) => {
        const res = await fetch(`${API_URL}/users/${id}`, {
            method: "DELETE",
        });
        return res.json();
    },
};

// Blog API
export const blogAPI = {
    create: async (formData: FormData) => {
        const res = await fetch(`${API_URL}/blogs`, {
            method: "POST",
            body: formData, // FormData for file upload
        });
        return res.json();
    },

    getAll: async () => {
        const res = await fetch(`${API_URL}/blogs`);
        return res.json();
    },

    getById: async (id: string) => {
        const res = await fetch(`${API_URL}/blogs/${id}`);
        return res.json();
    },

    getByUser: async (userId: string) => {
        const res = await fetch(`${API_URL}/blogs/user/${userId}`);
        return res.json();
    },

    update: async (id: string, formData: FormData) => {
        const res = await fetch(`${API_URL}/blogs/${id}`, {
            method: "PUT",
            body: formData, // FormData for file upload
        });
        return res.json();
    },

    delete: async (id: string) => {
        const res = await fetch(`${API_URL}/blogs/${id}`, {
            method: "DELETE",
        });
        return res.json();
    },
};

// Comment API
export const commentAPI = {
    add: async (data: { blogId: string; userId: string; content: string }) => {
        const res = await fetch(`${API_URL}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        return res.json();
    },

    getByBlog: async (blogId: string) => {
        const res = await fetch(`${API_URL}/comments/blog/${blogId}`);
        return res.json();
    },

    update: async (id: string, data: { content: string }) => {
        const res = await fetch(`${API_URL}/comments/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        return res.json();
    },

    delete: async (id: string) => {
        const res = await fetch(`${API_URL}/comments/${id}`, {
            method: "DELETE",
        });
        return res.json();
    },
};

// Like API
export const likeAPI = {
    like: async (data: { blogId: string; userId: string }) => {
        const res = await fetch(`${API_URL}/likes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        return res.json();
    },

    unlike: async (data: { blogId: string; userId: string }) => {
        const res = await fetch(`${API_URL}/likes/unlike`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        return res.json();
    },

    getByBlog: async (blogId: string) => {
        const res = await fetch(`${API_URL}/likes/blog/${blogId}`);
        return res.json();
    },

    checkUserLike: async (blogId: string, userId: string) => {
        const res = await fetch(`${API_URL}/likes/check/${blogId}/${userId}`);
        return res.json();
    },
};