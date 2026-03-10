"use client";

import { useEffect } from "react";
import { useLikeStore, useCommentStore, useAuthStore } from "@/stores";

interface LikeSectionProps {
    blogId: string;
    initialLikesCount: number;
}

const LikeSection = ({ blogId, initialLikesCount }: LikeSectionProps) => {
    const { user, isAuthenticated } = useAuthStore();
    const { likesCount, isLiked, checkUserLike, likeBlog, unlikeBlog, setLikesCount } = useLikeStore();
    const { comments } = useCommentStore();

    useEffect(() => {
        setLikesCount(initialLikesCount);
        if (isAuthenticated && user?._id) {
            checkUserLike(blogId, user._id);
        }
    }, [blogId, initialLikesCount, isAuthenticated, user, setLikesCount, checkUserLike]);

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

    return (
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
            <a href="#comments" className="text-gray-500 hover:text-indigo-600 transition">
                💬 {comments.length} Comments
            </a>
        </div>
    );
};

export default LikeSection;
