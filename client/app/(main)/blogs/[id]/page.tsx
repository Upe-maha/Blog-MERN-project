"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useBlogStore, useCommentStore, useLikeStore, useAuthStore } from "@/lib/store";
import Link from "next/link";

export default function SingleBlogPage() {
    const params = useParams();
    const blogId = params.id as string;

    const { user, isAuthenticated } = useAuthStore();
    const { currentBlog, isLoading: blogLoading, fetchBlogById, clearCurrentBlog } = useBlogStore();
    const { comments, isLoading: commentsLoading, fetchCommentsByBlog, addComment, deleteComment, clearComments } = useCommentStore();
    const { likesCount, isLiked, checkUserLike, likeBlog, unlikeBlog, setLikesCount } = useLikeStore();

    useEffect(() => {
        fetchBlogById(blogId);
        fetchCommentsByBlog(blogId);

        return () => {
            clearCurrentBlog();
            clearComments();
        };
    }, [blogId, fetchBlogById, fetchCommentsByBlog, clearCurrentBlog, clearComments]);

    useEffect(() => {
        if (currentBlog) {
            setLikesCount(currentBlog.likesCount || 0);
        }
        if (isAuthenticated && user?._id) {
            checkUserLike(blogId, user._id);
        }
    }, [currentBlog, isAuthenticated, user, blogId, setLikesCount, checkUserLike]);

    const handleLike = async () => {
        if (!isAuthenticated || !user?._id) {
            alert("Please login to like this blog");
            return;
        }

        if (isLiked) {
            await unlikeBlog(blogId, user._id);
        } else {
            await likeBlog(blogId, user._id);
        }
    };

    const handleAddComment = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        const content = formData.get("content") as string;

        if (!content.trim()) return;

        if (!isAuthenticated || !user?._id) {
            alert("Please login to comment");
            return;
        }

        await addComment({ blogId, userId: user._id, content });
        form.reset();
    };

    const handleDeleteComment = async (commentId: string) => {
        if (confirm("Are you sure you want to delete this comment?")) {
            await deleteComment(commentId);
        }
    };

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

    return (
        <div className="max-w-4xl mx-auto px-4 py-10">
            {/* Back Button */}
            <Link href="/blogs" className="text-indigo-600 hover:underline mb-6 inline-block">
                ← Back to blogs
            </Link>

            {/* Blog Content */}
            <article className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
                {currentBlog.imageUrl && (
                    <img
                        src={currentBlog.imageUrl}
                        alt={currentBlog.title}
                        className="w-full h-72 object-cover"
                    />
                )}

                <div className="p-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">{currentBlog.title}</h1>

                    {/* Author Info */}
                    <div className="flex items-center mb-6 pb-6 border-b">
                        <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                            {currentBlog.author?.username?.charAt(0).toUpperCase()}
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

                    {/* Blog Description */}
                    <div className="prose max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {currentBlog.description}
                    </div>

                    {/* Like Button */}
                    <div className="mt-8 pt-6 border-t flex items-center gap-6">
                        <button
                            onClick={handleLike}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${isLiked
                                    ? "bg-red-100 text-red-600"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            {isLiked ? "❤️" : "🤍"} {likesCount} Likes
                        </button>
                        <span className="text-gray-500">💬 {comments.length} Comments</span>
                    </div>
                </div>
            </article>

            {/* Comments Section */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Comments</h2>

                {/* Add Comment Form */}
                {isAuthenticated ? (
                    <form onSubmit={handleAddComment} className="mb-8">
                        <textarea
                            name="content"
                            placeholder="Write a comment..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition resize-none"
                            rows={3}
                            required
                        />
                        <button
                            type="submit"
                            className="mt-3 bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
                        >
                            Post Comment
                        </button>
                    </form>
                ) : (
                    <div className="mb-8 p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-gray-600 mb-2">Login to post a comment</p>
                        <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
                            Login here
                        </Link>
                    </div>
                )}

                {/* Comments List */}
                {commentsLoading ? (
                    <div className="text-center py-8">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                ) : comments.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                        No comments yet. Be the first to comment!
                    </p>
                ) : (
                    <div className="space-y-6">
                        {comments.map((comment) => (
                            <div key={comment._id} className="border-b pb-6 last:border-0">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                            {comment.user?.username?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="ml-3">
                                            <p className="font-semibold text-gray-800">
                                                {comment.user?.username}
                                            </p>
                                            <p className="text-gray-500 text-xs">
                                                {new Date(comment.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    {isAuthenticated && user?._id === comment.user?._id && (
                                        <button
                                            onClick={() => handleDeleteComment(comment._id)}
                                            className="text-red-500 hover:text-red-700 text-sm"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                                <p className="mt-3 text-gray-700 ml-13">{comment.content}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}