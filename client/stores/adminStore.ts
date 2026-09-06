import { create } from "zustand";
import type { User } from "@/types";
import {
    adminService,
    type AdminBlogRow,
    type AdminStats,
    type BlogsQuery,
    type UsersQuery,
} from "@/services/adminService";
import { getErrorMessage } from "@/lib/errorHandler";

const PAGE_SIZE = 20;

type UsersSort = NonNullable<UsersQuery["sort"]>;
type BlogsSort = NonNullable<BlogsQuery["sort"]>;

interface AdminState {
    stats: AdminStats | null;
    isLoadingStats: boolean;

    users: User[];
    usersTotal: number;
    usersPage: number;
    usersHasMore: boolean;
    usersQuery: string;
    usersSort: UsersSort;
    isLoadingUsers: boolean;

    blogs: AdminBlogRow[];
    blogsTotal: number;
    blogsPage: number;
    blogsHasMore: boolean;
    blogsQuery: string;
    blogsSort: BlogsSort;
    isLoadingBlogs: boolean;

    error: string | null;

    fetchStats: () => Promise<void>;
    fetchUsers: (opts?: { page?: number; q?: string; sort?: UsersSort }) => Promise<void>;
    fetchBlogs: (opts?: { page?: number; q?: string; sort?: BlogsSort }) => Promise<void>;
    toggleBlockUser: (userId: string) => Promise<string | null>;
    setUserRole: (userId: string, role: "user" | "admin") => Promise<string | null>;
    deleteUser: (userId: string) => Promise<string | null>;
    deleteBlog: (blogId: string) => Promise<string | null>;
    clearError: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
    stats: null,
    isLoadingStats: false,

    users: [],
    usersTotal: 0,
    usersPage: 1,
    usersHasMore: false,
    usersQuery: "",
    usersSort: "newest",
    isLoadingUsers: false,

    blogs: [],
    blogsTotal: 0,
    blogsPage: 1,
    blogsHasMore: false,
    blogsQuery: "",
    blogsSort: "newest",
    isLoadingBlogs: false,

    error: null,

    fetchStats: async () => {
        set({ isLoadingStats: true });
        try {
            set({ stats: await adminService.getStats(), isLoadingStats: false });
        } catch (err) {
            set({
                isLoadingStats: false,
                error: getErrorMessage(err, "Could not load the dashboard figures."),
            });
        }
    },

    // One page at a time, replacing the list rather than appending: an admin table is something
    // you page through and search, not an infinite feed.
    fetchUsers: async (opts = {}) => {
        const { usersQuery, usersSort } = get();
        const q = opts.q ?? usersQuery;
        const sort = opts.sort ?? usersSort;
        const page = opts.page ?? 1;

        set({ isLoadingUsers: true, error: null, usersQuery: q, usersSort: sort });
        try {
            const data = await adminService.getUsers({
                page,
                limit: PAGE_SIZE,
                q: q || undefined,
                sort,
            });
            set({
                users: data.users,
                usersTotal: data.total,
                usersPage: data.page,
                usersHasMore: data.hasMore,
                isLoadingUsers: false,
            });
        } catch (err) {
            set({
                isLoadingUsers: false,
                error: getErrorMessage(err, "Could not load the user list."),
            });
        }
    },

    fetchBlogs: async (opts = {}) => {
        const { blogsQuery, blogsSort } = get();
        const q = opts.q ?? blogsQuery;
        const sort = opts.sort ?? blogsSort;
        const page = opts.page ?? 1;

        set({ isLoadingBlogs: true, error: null, blogsQuery: q, blogsSort: sort });
        try {
            const data = await adminService.getBlogs({
                page,
                limit: PAGE_SIZE,
                q: q || undefined,
                sort,
            });
            set({
                blogs: data.blogs,
                blogsTotal: data.total,
                blogsPage: data.page,
                blogsHasMore: data.hasMore,
                isLoadingBlogs: false,
            });
        } catch (err) {
            set({
                isLoadingBlogs: false,
                error: getErrorMessage(err, "Could not load the post list."),
            });
        }
    },

    // These four return an error string on failure and null on success, so the caller can toast the
    // server's actual message — "You cannot block the last remaining admin" is the whole point of
    // the guard, and the old fixed strings threw it away.
    toggleBlockUser: async (userId) => {
        try {
            const data = await adminService.toggleBlockUser(userId);
            set((state) => ({
                users: state.users.map((u) =>
                    u._id === userId ? { ...u, isBlocked: data.user.isBlocked } : u
                ),
            }));
            // The blocked figure on the stat row is now stale.
            void get().fetchStats();
            return null;
        } catch (err) {
            return getErrorMessage(err, "Could not update that account.");
        }
    },

    setUserRole: async (userId, role) => {
        try {
            const data = await adminService.setUserRole(userId, role);
            set((state) => ({
                users: state.users.map((u) => (u._id === userId ? { ...u, role: data.user.role } : u)),
            }));
            void get().fetchStats();
            return null;
        } catch (err) {
            return getErrorMessage(err, "Could not change that role.");
        }
    },

    deleteUser: async (userId) => {
        try {
            await adminService.deleteUser(userId);
            set((state) => ({
                users: state.users.filter((u) => u._id !== userId),
                usersTotal: Math.max(0, state.usersTotal - 1),
                // Their posts went with them. The guard matters: a post whose author row is
                // missing has no `author` at all — the aggregation preserves it deliberately —
                // and reading `.author._id` on one used to throw right here.
                blogs: state.blogs.filter((b) => b.author?._id !== userId),
            }));
            void get().fetchStats();
            return null;
        } catch (err) {
            return getErrorMessage(err, "Could not delete that account.");
        }
    },

    deleteBlog: async (blogId) => {
        try {
            await adminService.deleteBlog(blogId);
            set((state) => ({
                blogs: state.blogs.filter((b) => b._id !== blogId),
                blogsTotal: Math.max(0, state.blogsTotal - 1),
            }));
            void get().fetchStats();
            return null;
        } catch (err) {
            return getErrorMessage(err, "Could not delete that post.");
        }
    },

    clearError: () => set({ error: null }),
}));
