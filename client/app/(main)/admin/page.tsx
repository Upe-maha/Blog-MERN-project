"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useAdminStore } from "@/stores";
import { getImageUrl } from "@/lib/api";

type Tab = "users" | "blogs";

export default function AdminDashboard() {
    const router = useRouter();
    const { user, isAuthenticated, isHydrated } = useAuthStore();
    const {
        users, blogs,
        isLoadingUsers, isLoadingBlogs,
        error,
        fetchUsers, toggleBlockUser, deleteUser,
        fetchBlogs, deleteBlog,
        clearError,
    } = useAdminStore();

    const [activeTab, setActiveTab] = useState<Tab>("users");
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; type: "user" | "blog" } | null>(null);

    // Auth guard: wait for hydration, then check admin role
    useEffect(() => {
        if (!isHydrated) return;
        if (!isAuthenticated || user?.role !== "admin") {
            router.push("/blogs");
        }
    }, [isHydrated, isAuthenticated, user, router]);

    // Load data for the active tab
    useEffect(() => {
        if (!isHydrated || user?.role !== "admin") return;
        if (activeTab === "users") fetchUsers();
        else fetchBlogs();
    }, [activeTab, isHydrated, user]);

    // ── Confirm delete handler ──────────────────────────────────────────────
    const handleDeleteConfirm = async () => {
        if (!confirmDelete) return;
        if (confirmDelete.type === "user") await deleteUser(confirmDelete.id);
        else await deleteBlog(confirmDelete.id);
        setConfirmDelete(null);
    };

    // ── Show nothing until hydration completes ──────────────────────────────
    if (!isHydrated || !isAuthenticated || user?.role !== "admin") {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-10">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-500 mt-1">Manage users and content across the platform</p>
            </div>

            {/* ── Global error banner ─────────────────────────────────────── */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={clearError} className="text-red-400 hover:text-red-600 text-xl leading-none">&times;</button>
                </div>
            )}

            {/* ── Tabs ───────────────────────────────────────────────────── */}
            <div className="flex gap-2 border-b border-gray-200 mb-8">
                {(["users", "blogs"] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 text-sm font-semibold capitalize transition border-b-2 -mb-px ${
                            activeTab === tab
                                ? "border-indigo-600 text-indigo-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        {tab === "users"
                            ? `Users (${users.length})`
                            : `Blogs (${blogs.length})`}
                    </button>
                ))}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                USERS TAB
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === "users" && (
                <>
                    {isLoadingUsers ? (
                        <div className="flex justify-center py-20">
                            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : users.length === 0 ? (
                        <p className="text-center text-gray-400 py-20">No users found.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {["User", "Email", "Role", "Status", "Actions"].map((h) => (
                                            <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {users.map((u) => (
                                        <tr key={u._id} className={u.isBlocked ? "bg-red-50" : ""}>
                                            {/* User */}
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full overflow-hidden bg-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-600 font-semibold">
                                                    {getImageUrl(u.profilePicture) ? (
                                                        <img src={getImageUrl(u.profilePicture)} alt={u.username} className="w-full h-full object-cover" />
                                                    ) : (
                                                        u.username.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{u.username}</p>
                                                    {u._id === user?._id && (
                                                        <span className="text-xs text-indigo-500">(you)</span>
                                                    )}
                                                </div>
                                            </td>
                                            {/* Email */}
                                            <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                                            {/* Role */}
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    u.role === "admin"
                                                        ? "bg-purple-100 text-purple-700"
                                                        : "bg-gray-100 text-gray-600"
                                                }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            {/* Status */}
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    u.isBlocked
                                                        ? "bg-red-100 text-red-700"
                                                        : "bg-green-100 text-green-700"
                                                }`}>
                                                    {u.isBlocked ? "Blocked" : "Active"}
                                                </span>
                                            </td>
                                            {/* Actions */}
                                            <td className="px-6 py-4">
                                                {u._id === user?._id ? (
                                                    <span className="text-xs text-gray-400">—</span>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => toggleBlockUser(u._id)}
                                                            className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                                                                u.isBlocked
                                                                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                                                                    : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                                                            }`}
                                                        >
                                                            {u.isBlocked ? "Unblock" : "Block"}
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDelete({ id: u._id, type: "user" })}
                                                            className="px-3 py-1 text-xs font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* ══════════════════════════════════════════════════════════════
                BLOGS TAB
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === "blogs" && (
                <>
                    {isLoadingBlogs ? (
                        <div className="flex justify-center py-20">
                            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : blogs.length === 0 ? (
                        <p className="text-center text-gray-400 py-20">No blogs found.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {["Blog", "Author", "Stats", "Date", "Action"].map((h) => (
                                            <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {blogs.map((b) => (
                                        <tr key={b._id}>
                                            {/* Blog title + thumbnail */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {b.imageUrl ? (
                                                        <img
                                                            src={getImageUrl(b.imageUrl)}
                                                            alt={b.title}
                                                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-400 text-lg">
                                                            📝
                                                        </div>
                                                    )}
                                                    <p className="font-medium text-gray-900 line-clamp-2 max-w-xs">
                                                        {b.title}
                                                    </p>
                                                </div>
                                            </td>
                                            {/* Author */}
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs text-indigo-600 font-semibold overflow-hidden">
                                                        {getImageUrl(b.author?.profilePicture) ? (
                                                            <img src={getImageUrl(b.author.profilePicture)} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            b.author?.username?.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <span>{b.author?.username}</span>
                                                </div>
                                            </td>
                                            {/* Stats */}
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                <span className="mr-3">❤️ {b.likesCount}</span>
                                                <span>💬 {b.commentsCount}</span>
                                            </td>
                                            {/* Date */}
                                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                                {new Date(b.createdAt).toLocaleDateString()}
                                            </td>
                                            {/* Action */}
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => setConfirmDelete({ id: b._id, type: "blog" })}
                                                    className="px-3 py-1 text-xs font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* ── Confirmation Modal ──────────────────────────────────────── */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Delete</h3>
                        <p className="text-gray-600 mb-6">
                            {confirmDelete.type === "user"
                                ? "This will permanently delete the user and all their blogs, comments, and likes."
                                : "This will permanently delete the blog and all its comments and likes."}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
