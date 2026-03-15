import type { Request, Response } from "express";
import User from "../models/user";
import Blog from "../models/blog";
import Comment from "../models/comment";
import Like from "../models/like";
import fs from "fs";
import path from "path";

const deleteFile = (filePath: string) => {
    if (!filePath) return;
    const abs = path.join(process.cwd(), filePath);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
};

// GET /api/admin/users — all users except password
export const getAllUsersAdmin = async (_req: Request, res: Response) => {
    try {
        const users = await User.find()
            .select("-password")
            .sort({ createdAt: -1 });
        return res.status(200).json({ users });
    } catch {
        return res.status(500).json({ message: "Internal server error" });
    }
};

// PATCH /api/admin/users/:id/block — toggle isBlocked
export const toggleBlockUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Prevent admin from blocking themselves
        if (req.user?.userId === id) {
            return res.status(400).json({ message: "You cannot block your own account" });
        }

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.isBlocked = !user.isBlocked;
        await user.save();

        return res.status(200).json({
            message: user.isBlocked ? "User blocked successfully" : "User unblocked successfully",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                isBlocked: user.isBlocked,
            },
        });
    } catch {
        return res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE /api/admin/users/:id — delete user and all their content
export const deleteUserAdmin = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        if (req.user?.userId === id) {
            return res.status(400).json({ message: "You cannot delete your own account" });
        }

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Clean up profile picture
        if (user.profilePicture) deleteFile(user.profilePicture);

        // Clean up all blogs authored by this user (and their images)
        const userBlogs = await Blog.find({ author: id });
        for (const blog of userBlogs) {
            if (blog.imageUrl) deleteFile(blog.imageUrl);
            await Comment.deleteMany({ blog: blog._id });
            await Like.deleteMany({ blog: blog._id });
        }
        await Blog.deleteMany({ author: id });

        // Clean up any comments/likes left by this user on other blogs
        await Comment.deleteMany({ user: id });
        await Like.deleteMany({ user: id });

        await User.findByIdAndDelete(id);
        return res.status(200).json({ message: "User and all associated content deleted" });
    } catch {
        return res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/admin/blogs — all blogs without pagination
export const getAllBlogsAdmin = async (_req: Request, res: Response) => {
    try {
        const blogs = await Blog.find()
            .populate("author", "username email profilePicture role")
            .sort({ createdAt: -1 });

        const blogsWithCounts = await Promise.all(
            blogs.map(async (blog) => {
                const commentsCount = await Comment.countDocuments({ blog: blog._id });
                const likesCount    = await Like.countDocuments({ blog: blog._id });
                return { ...blog.toObject(), commentsCount, likesCount };
            })
        );

        return res.status(200).json({ blogs: blogsWithCounts });
    } catch {
        return res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE /api/admin/blogs/:id — admin can delete any blog
export const deleteAnyBlog = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const blog = await Blog.findById(id);
        if (!blog) return res.status(404).json({ message: "Blog not found" });

        if (blog.imageUrl) deleteFile(blog.imageUrl);
        await Comment.deleteMany({ blog: id });
        await Like.deleteMany({ blog: id });
        await Blog.findByIdAndDelete(id);

        return res.status(200).json({ message: "Blog deleted successfully" });
    } catch {
        return res.status(500).json({ message: "Internal server error" });
    }
};
