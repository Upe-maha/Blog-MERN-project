"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useBlogStore } from "@/stores";
import Link from "next/link";
import { getImageUrl } from "@/lib/api";
import LikeSection from "@/components/blog/LikeSection";
import CommentSection from "@/components/blog/CommentSection";

export default function SingleBlogPage() {
    const params = useParams();
    const blogId = params.id as string;

    const { currentBlog, isLoading: blogLoading, fetchBlogById, clearCurrentBlog } = useBlogStore();

    useEffect(() => {
        fetchBlogById(blogId);
        return () => {
            clearCurrentBlog();
        };
    }, [blogId, fetchBlogById, clearCurrentBlog]);

    if (blogLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading blog...</p>
                </div>
            </div>
        );
    }

    if (!currentBlog) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">😢</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Blog not found</h2>
                    <Link href="/blogs" className="text-indigo-600 hover:underline">
                        ← Back to blogs
                    </Link>
                </div>
            </div>
        );
    }

    const blogImageUrl = getImageUrl(currentBlog.imageUrl);
    const authorImageUrl = getImageUrl(currentBlog.author?.profilePicture);

    return (
        <div className="max-w-3xl mx-auto px-4 py-10">
            {/* Back Button */}
            <Link href="/blogs" className="text-indigo-600 hover:underline mb-6 inline-block">
                ← Back to blogs
            </Link>

            {/* Blog Post Card */}
            <article className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">

                {/* Author Info — top */}
                <div className="px-6 pt-6 pb-4 flex items-center border-b border-gray-100">
                    <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white text-lg font-bold overflow-hidden shrink-0">
                        {authorImageUrl ? (
                            <img
                                src={authorImageUrl}
                                alt={currentBlog.author?.username}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            currentBlog.author?.username?.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="ml-4">
                        <p className="font-semibold text-gray-800">{currentBlog.author?.username}</p>
                        <p className="text-gray-500 text-sm">
                            {new Date(currentBlog.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </p>
                    </div>
                </div>

                {/* Title + Description */}
                <div className="px-6 py-5">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">{currentBlog.title}</h1>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {currentBlog.description}
                    </div>
                </div>

                {/* Image — natural aspect ratio, edge-to-edge */}
                {blogImageUrl && (
                    <img
                        src={blogImageUrl}
                        alt={currentBlog.title}
                        className="w-full h-auto"
                    />
                )}

                {/* Like Section */}
                <div className="px-6">
                    <LikeSection
                        blogId={blogId}
                        initialLikesCount={currentBlog.likesCount || 0}
                    />
                </div>
            </article>

            {/* Comments Section */}
            <CommentSection blogId={blogId} />
        </div>
    );
}
