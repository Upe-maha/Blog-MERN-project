"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useBlogStore, useAuthStore } from "@/stores";
import BlogCard from "@/components/blog/BlogCard";
import Link from "next/link";

function BlogsContent() {
    const searchParams = useSearchParams();
    const { blogs, isLoading, error, fetchBlogs } = useBlogStore();
    const { isAuthenticated } = useAuthStore();
    const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");

    useEffect(() => {
        fetchBlogs();
    }, [fetchBlogs]);

    // Sync with URL ?q= param when it changes (e.g. navbar search)
    useEffect(() => {
        setSearchTerm(searchParams.get("q") || "");
    }, [searchParams]);

    const filteredBlogs = blogs.filter(
        (blog) =>
            blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            blog.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading blogs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">All Blogs</h1>
                    <p className="text-gray-600">
                        {searchTerm
                            ? `Showing results for "${searchTerm}"`
                            : "Discover amazing stories from our community"}
                    </p>
                </div>
                {isAuthenticated && (
                    <Link
                        href="/blogs/create"
                        className="mt-4 md:mt-0 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
                    >
                        + Create Blog
                    </Link>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {/* Blogs Grid */}
            {filteredBlogs.length === 0 ? (
                <div className="text-center py-20">
                    <div className="text-6xl mb-4">📝</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        {searchTerm ? "No blogs match your search" : "No blogs found"}
                    </h2>
                    <p className="text-gray-600 mb-6">
                        {searchTerm ? "Try a different keyword." : "Be the first one to create a blog!"}
                    </p>
                    {!searchTerm && (
                        isAuthenticated ? (
                            <Link
                                href="/blogs/create"
                                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition inline-block"
                            >
                                Create Your First Blog
                            </Link>
                        ) : (
                            <Link
                                href="/login"
                                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition inline-block"
                            >
                                Login to Create Blog
                            </Link>
                        )
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredBlogs.map((blog) => (
                        <BlogCard key={blog._id} blog={blog} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function BlogsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
        }>
            <BlogsContent />
        </Suspense>
    );
}
