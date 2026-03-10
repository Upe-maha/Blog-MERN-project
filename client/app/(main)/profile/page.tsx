"use client";

import { useAuthStore } from "@/stores";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Blog } from "@/types";
import { blogService } from "@/services/blogService";
import { getImageUrl } from "@/lib/api";
import Link from "next/link";
import BlogCard from "@/components/blog/BlogCard";

export default function ProfilePage() {
    const router = useRouter();
    const { user, isAuthenticated, logout } = useAuthStore();
    const [userBlogs, setUserBlogs] = useState<Blog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }
        fetchUserBlogs();
    }, [isAuthenticated, router]);

    const fetchUserBlogs = async () => {
        try {
            const response = await blogService.getAll();
            const blogs = response.blogs || [];
            // Filter blogs by current user
            const filtered = blogs.filter(
                (blog: Blog) => blog.author?._id === user?._id
            );
            setUserBlogs(filtered);
        } catch (error) {
            console.error("Error fetching blogs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteBlog = async (blogId: string) => {
        if (!confirm("Are you sure you want to delete this blog?")) return;

        try {
            await blogService.delete(blogId);
            setUserBlogs((prev) => prev.filter((blog) => blog._id !== blogId));
        } catch (error) {
            console.error("Error deleting blog:", error);
        }
    };

    const handleLogout = () => {
        logout();
        router.push("/");
    };

    if (!isAuthenticated || !user) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-10">
            {/* Profile Header */}
            <div className="bg-white/50 rounded-2xl shadow-lg p-8 mb-8">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    {/* Avatar */}
                    <div className="w-24 h-24 bg-indigo-500 rounded-full flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
                        {getImageUrl(user.profilePicture) ? (
                            <img
                                src={getImageUrl(user.profilePicture)}
                                alt={user.username}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            user.username?.charAt(0).toUpperCase()
                        )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            {user.username}
                        </h1>
                        <p className="text-gray-500 mb-4">{user.email}</p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <div className="bg-indigo-50 px-4 py-2 rounded-lg">
                                <span className="text-indigo-600 font-bold">{userBlogs.length}</span>
                                <span className="text-gray-600 ml-1">Blogs</span>
                            </div>
                            <div className="bg-green-50 px-4 py-2 rounded-lg">
                                <span className="text-green-600 font-bold">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </span>
                                <span className="text-gray-600 ml-1">Joined</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Link
                            href="/blogs/create"
                            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
                        >
                            + New Blog
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="border border-red-500 text-red-500 px-6 py-2 rounded-lg font-semibold hover:bg-red-50 transition"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* User's Blogs */}
            <div className="bg-white/50 rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">My Blogs</h2>

                {isLoading ? (
                    <div className="text-center py-10">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                ) : userBlogs.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="text-6xl mb-4">📝</div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No blogs yet</h3>
                        <p className="text-gray-500 mb-6">Start sharing your ideas with the world!</p>
                        <Link
                            href="/blogs/create"
                            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition inline-block"
                        >
                            Create Your First Blog
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {userBlogs.map((blog) => (
                            <div key={blog._id} className="relative group">
                                <BlogCard blog={blog} />
                                <button
                                    onClick={() => handleDeleteBlog(blog._id)}
                                    className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-semibold opacity-0 group-hover:opacity-100 transition"
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}