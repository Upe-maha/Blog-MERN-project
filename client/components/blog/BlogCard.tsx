"use client";

import Link from "next/link";
import { Blog } from "@/types";
import { getImageUrl } from "@/lib/api";
import LikeButton from "./LikeButton";

interface BlogCardProps {
    blog: Blog;
}

const BlogCard = ({ blog }: BlogCardProps) => {
    const imageUrl = getImageUrl(blog.imageUrl);
    const authorImage = getImageUrl(blog.author?.profilePicture);

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col">

            {/* Author Info — top */}
            <div className="px-4 pt-3 pb-2 flex items-center border-b border-gray-100">
                {authorImage ? (
                    <img
                        src={authorImage}
                        alt={blog.author?.username}
                        className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                ) : (
                    <div className="w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs shrink-0">
                        {blog.author?.username?.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className="ml-3 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{blog.author?.username}</p>
                    <p className="text-gray-400 text-xs">
                        {new Date(blog.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                        })}
                    </p>
                </div>
            </div>

            {/* Title + Description */}
            <div className="px-4 py-2">
                <h2 className="text-sm font-bold text-gray-800 mb-1 line-clamp-2">{blog.title}</h2>
                <p className="text-gray-500 text-xs line-clamp-2">{blog.description}</p>
            </div>

            {/* Image — fixed container, full image visible, blurred fill behind */}
            {imageUrl ? (
                <div className="relative h-44 overflow-hidden bg-black">
                    {/* blurred fill for letterbox areas */}
                    <img
                        src={imageUrl}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover scale-110 blur-md opacity-50"
                    />
                    {/* actual image — complete, no crop */}
                    <img
                        src={imageUrl}
                        alt={blog.title}
                        className="relative z-10 w-full h-full object-contain"
                    />
                </div>
            ) : (
                <div className="w-full h-44 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                    <span className="text-white text-4xl">📝</span>
                </div>
            )}

            {/* Stats & Actions */}
            <div className="px-4 py-2 flex justify-between items-center mt-auto">
                <div className="flex items-center space-x-4 text-sm">
                    <LikeButton
                        blogId={blog._id}
                        initialLikesCount={blog.likesCount || 0}
                    />
                    <Link
                        href={`/blogs/${blog._id}#comments`}
                        className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 transition"
                    >
                        💬 {blog.commentsCount || 0}
                    </Link>
                </div>
                <Link
                    href={`/blogs/${blog._id}`}
                    className="text-indigo-600 hover:underline text-sm font-medium"
                >
                    Read More →
                </Link>
            </div>
        </div>
    );
};

export default BlogCard;
