"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores";
import { likeService } from "@/services/blogService";

interface LikeButtonProps {
    blogId: string;
    initialLikesCount: number;
}

const LikeButton = ({ blogId, initialLikesCount }: LikeButtonProps) => {
    const { user, isAuthenticated } = useAuthStore();
    const [likesCount, setLikesCount] = useState(initialLikesCount);
    const [isLiked, setIsLiked] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated || !user?._id || isLoading) return;

        setIsLoading(true);
        try {
            if (isLiked) {
                await likeService.unlike({ blogId, userId: user._id });
                setLikesCount((prev) => prev - 1);
                setIsLiked(false);
            } else {
                await likeService.like({ blogId, userId: user._id });
                setLikesCount((prev) => prev + 1);
                setIsLiked(true);
            }
        } catch {
            // silent fail
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <Link
                href="/login"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-gray-500 text-sm hover:text-red-500 transition"
            >
                🤍 {likesCount}
            </Link>
        );
    }

    return (
        <button
            onClick={handleLike}
            disabled={isLoading}
            className={`flex items-center gap-1 text-sm transition disabled:opacity-50 ${
                isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"
            }`}
        >
            {isLiked ? "❤️" : "🤍"} {likesCount}
        </button>
    );
};

export default LikeButton;
