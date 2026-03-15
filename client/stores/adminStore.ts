import { create } from "zustand";
import { User, Blog } from "@/types";
import { adminService } from "@/services/adminService";

interface AdminState {
    users: User[];
    blogs: Blog[];
    isLoadingUsers: boolean;
    isLoadingBlogs: boolean;
    error: string | null;

    fetchUsers: () => Promise<void>;
    toggleBlockUser: (userId: string) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    fetchBlogs: () => Promise<void>;
    deleteBlog: (blogId: string) => Promise<void>;
    clearError: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
    users: [],
    blogs: [],
    isLoadingUsers: false,
    isLoadingBlogs: false,
    error: null,

    fetchUsers: async () => {
        set({ isLoadingUsers: true, error: null });
        try {
            const data = await adminService.getUsers();
            set({ users: data.users || [], isLoadingUsers: false });
        } catch {
            set({ error: "Failed to fetch users", isLoadingUsers: false });
        }
    },

    toggleBlockUser: async (userId) => {
        try {
            const data = await adminService.toggleBlockUser(userId);
            // Update the user in the local list immediately
            set((state) => ({
                users: state.users.map((u) =>
                    u._id === userId ? { ...u, isBlocked: data.user.isBlocked } : u
                ),
            }));
        } catch {
            set({ error: "Failed to update user status" });
        }
    },

    deleteUser: async (userId) => {
        try {
            await adminService.deleteUser(userId);
            set((state) => ({
                users: state.users.filter((u) => u._id !== userId),
                // Also remove their blogs from the local blog list
                blogs: state.blogs.filter((b) => b.author._id !== userId),
            }));
        } catch {
            set({ error: "Failed to delete user" });
        }
    },

    fetchBlogs: async () => {
        set({ isLoadingBlogs: true, error: null });
        try {
            const data = await adminService.getBlogs();
            set({ blogs: data.blogs || [], isLoadingBlogs: false });
        } catch {
            set({ error: "Failed to fetch blogs", isLoadingBlogs: false });
        }
    },

    deleteBlog: async (blogId) => {
        try {
            await adminService.deleteBlog(blogId);
            set((state) => ({
                blogs: state.blogs.filter((b) => b._id !== blogId),
            }));
        } catch {
            set({ error: "Failed to delete blog" });
        }
    },

    clearError: () => set({ error: null }),
}));
