import apiClient from "@/lib/api";
import type { BlogListItem, User } from "@/types";

export interface AdminStats {
    users: number;
    blocked: number;
    admins: number;
    newUsers7d: number;
    blogs: number;
    comments: number;
    likes: number;
}

export interface AdminUsersResponse {
    users: User[];
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
}

// The admin table shows the author's email and role alongside the post, which the public list
// deliberately never projects.
export type AdminBlogRow = BlogListItem & {
    author: BlogListItem["author"] & { email?: string; role?: string };
};

export interface AdminBlogsResponse {
    blogs: AdminBlogRow[];
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
}

export type UsersQuery = {
    page?: number;
    limit?: number;
    q?: string;
    sort?: "newest" | "oldest" | "username" | "email";
    role?: "user" | "admin";
    blocked?: "true" | "false";
};

export type BlogsQuery = {
    page?: number;
    limit?: number;
    q?: string;
    sort?: "newest" | "oldest" | "title" | "comments" | "likes";
};

export const adminService = {
    getStats: async () => {
        const response = await apiClient.get<AdminStats>("/admin/stats");
        return response.data;
    },

    getUsers: async (params: UsersQuery = {}) => {
        const response = await apiClient.get<AdminUsersResponse>("/admin/users", { params });
        return response.data;
    },

    toggleBlockUser: async (userId: string) => {
        const response = await apiClient.patch<{ message: string; user: User }>(
            `/admin/users/${userId}/block`
        );
        return response.data;
    },

    setUserRole: async (userId: string, role: "user" | "admin") => {
        const response = await apiClient.post<{ message: string; user: User }>(
            `/admin/users/${userId}/role`,
            { role }
        );
        return response.data;
    },

    deleteUser: async (userId: string) => {
        const response = await apiClient.delete<{ message: string }>(`/admin/users/${userId}`);
        return response.data;
    },

    getBlogs: async (params: BlogsQuery = {}) => {
        const response = await apiClient.get<AdminBlogsResponse>("/admin/blogs", { params });
        return response.data;
    },

    deleteBlog: async (blogId: string) => {
        const response = await apiClient.delete<{ message: string }>(`/admin/blogs/${blogId}`);
        return response.data;
    },
};
