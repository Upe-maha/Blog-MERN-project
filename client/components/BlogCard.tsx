import Link from "next/link";
import { Blog } from "@/types";
import { getImageUrl } from "@/lib/api";

interface BlogCardProps {
    blog: Blog;
}

const BlogCard = ({ blog }: BlogCardProps) => {
    const imageUrl = getImageUrl(blog.imageUrl);
    const authorImage = getImageUrl(blog.author?.profilePicture);

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            {/* Blog Image */}
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={blog.title}
                    className="w-full h-48 object-cover"
                />
            ) : (
                <div className="w-full h-48 bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                    <span className="text-white text-4xl">📝</span>
                </div>
            )}

            {/* Blog Content */}
            <div className="p-5">
                <h2 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                    {blog.title}
                </h2>

                <p className="text-gray-600 mb-4 line-clamp-3">
                    {blog.description}
                </p>

                {/* Author Info */}
                <div className="flex items-center mb-4">
                    {authorImage ? (
                        <img
                            src={authorImage}
                            alt={blog.author?.username}
                            className="w-8 h-8 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm">
                            {blog.author?.username?.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <span className="ml-2 text-gray-700 text-sm">
                        {blog.author?.username}
                    </span>
                </div>

                {/* Stats & Link */}
                <div className="flex justify-between items-center">
                    <div className="flex space-x-4 text-gray-500 text-sm">
                        <span>❤️ {blog.likesCount || 0}</span>
                        <span>💬 {blog.commentsCount || 0}</span>
                    </div>

                    <Link
                        href={`/blogs/${blog._id}`}
                        className="text-indigo-600 hover:underline text-sm font-medium"
                    >
                        Read More →
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default BlogCard;