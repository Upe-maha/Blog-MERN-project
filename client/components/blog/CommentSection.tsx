"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCommentStore, useAuthStore } from "@/stores";
import { getImageUrl } from "@/lib/api";

interface CommentSectionProps {
    blogId: string;
}

const CommentSection = ({ blogId }: CommentSectionProps) => {
    const { user, isAuthenticated } = useAuthStore();
    const {
        comments,
        isLoading,
        fetchCommentsByBlog,
        addComment,
        deleteComment,
        clearComments,
    } = useCommentStore();

    const [commentText, setCommentText] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        fetchCommentsByBlog(blogId);
        return () => {
            clearComments();
        };
    }, [blogId, fetchCommentsByBlog, clearComments]);

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCommentText(e.target.value);
        const ta = textareaRef.current;
        if (ta) {
            ta.style.height = "auto";
            // cap at ~3 lines (72px ≈ 3 × 24px line-height)
            ta.style.height = Math.min(ta.scrollHeight, 72) + "px";
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!commentText.trim()) return;
        if (!isAuthenticated || !user?._id) {
            alert("Please login to comment");
            return;
        }
        await addComment({ blogId, userId: user._id, content: commentText });
        setCommentText("");
        if (textareaRef.current) {
            textareaRef.current.style.height = "24px";
        }
    };

    // Enter submits, Shift+Enter adds a new line
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (confirm("Are you sure you want to delete this comment?")) {
            await deleteComment(commentId);
        }
    };

    const userImageUrl = getImageUrl(user?.profilePicture);

    return (
        <div id="comments" className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-5">
                Comments ({comments.length})
            </h2>

            {/* Add Comment — inline input bar */}
            {isAuthenticated ? (
                <form
                    onSubmit={handleSubmit}
                    className="mb-6 flex items-end gap-2 border border-gray-300 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition"
                >
                    {/* Current user avatar */}
                    <div className="w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0 mb-0.5">
                        {userImageUrl ? (
                            <img
                                src={userImageUrl}
                                alt={user?.username}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            user?.username?.charAt(0).toUpperCase()
                        )}
                    </div>

                    {/* Auto-grow textarea — max 3 lines, overflow hidden */}
                    <textarea
                        ref={textareaRef}
                        value={commentText}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Write a comment… (Enter to post)"
                        className="flex-1 resize-none outline-none bg-transparent text-sm text-gray-700 placeholder-gray-400 overflow-hidden leading-6"
                        style={{ minHeight: "24px", maxHeight: "72px", height: "24px" }}
                        rows={1}
                    />

                    {/* Send icon */}
                    <button
                        type="submit"
                        disabled={!commentText.trim()}
                        className="text-indigo-600 hover:text-indigo-700 disabled:opacity-30 transition shrink-0 mb-0.5"
                        aria-label="Post comment"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                </form>
            ) : (
                <div className="mb-6 p-3 bg-gray-50 rounded-xl text-center">
                    <p className="text-gray-500 text-sm mb-1">Login to post a comment</p>
                    <Link href="/login" className="text-indigo-600 text-sm font-semibold hover:underline">
                        Login here
                    </Link>
                </div>
            )}

            {/* Comments List */}
            {isLoading ? (
                <div className="text-center py-6">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
            ) : comments.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">
                    No comments yet. Be the first to comment!
                </p>
            ) : (
                <div className="space-y-4">
                    {comments.map((comment) => {
                        const commentUserImage = getImageUrl(comment.user?.profilePicture);
                        return (
                            <div key={comment._id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">

                                {/* Commenter avatar with profile picture */}
                                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0 mt-0.5">
                                    {commentUserImage ? (
                                        <img
                                            src={commentUserImage}
                                            alt={comment.user?.username}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        comment.user?.username?.charAt(0).toUpperCase()
                                    )}
                                </div>

                                {/* Comment body */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="font-semibold text-gray-800 text-sm truncate">
                                                {comment.user?.username}
                                            </span>
                                            <span className="text-gray-400 text-xs shrink-0">
                                                {new Date(comment.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {isAuthenticated && user?._id === comment.user?._id && (
                                            <button
                                                onClick={() => handleDeleteComment(comment._id)}
                                                className="text-red-400 hover:text-red-600 text-xs shrink-0"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-gray-700 text-sm mt-1 break-words">
                                        {comment.content}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CommentSection;
