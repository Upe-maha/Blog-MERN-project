import type { Request, Response } from "express"; import Blog from "../models/blog";
import Comment from "../models/comment";
import Like from "../models/like";
import fs from "fs";
import path from "path";
import { cursorTo } from "readline";

// Helper function to get image URL
const getImageUrl = (filename: string | undefined): string => {
    if (!filename) return "";
    return `/uploads/blogs/${filename}`;
};

// Helper function to delete image
const deleteImage = (imageUrl: string) => {
    if (!imageUrl) return;

    const imagePath = path.join(process.cwd(), imageUrl);
    if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
    }
};

// Create Blog with Image
export const createBlog = async (req: Request, res: Response) => {
    const { title, description, author } = req.body;
    const file = req.file;

    if (!title || !description || !author) {
        if (file) deleteImage(`/uploads/blogs/${file.filename}`);
        return res.status(400).json({ message: "Title, description, and author are required" });
    }

    try {
        const imageUrl = file ? getImageUrl(file.filename) : "";

        const newBlog = new Blog({
            title,
            description,
            imageUrl,
            author,
        });

        await newBlog.save();

        // Populate author details
        const populatedBlog = await Blog.findById(newBlog._id).populate(
            "author",
            "username email profilePicture"
        );

        return res.status(201).json({
            message: "Blog created successfully",
            blog: populatedBlog,
        });
    } catch (error) {
        if (file) deleteImage(`/uploads/blogs/${file.filename}`);
        console.log("Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Get All Blogs
export const getAllBlogs = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 5; // 0 means no limit
        console.log("Limit:", limit);
        const page = parseInt(req.query.page as string) || 1;
        console.log("Page:", page);
        const skip = (page - 1) * limit;
        console.log("Skip:", skip);
        const blogs = await Blog.find()
            .populate("author", "username email profilePicture")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const totalBlogs = await Blog.countDocuments();
        // Add comments and likes count
        const blogsWithCounts = await Promise.all(
            blogs.map(async (blog) => {
                const commentsCount = await Comment.countDocuments({ blog: blog._id });
                const likesCount = await Like.countDocuments({ blog: blog._id });
                return {
                    ...blog.toObject(),
                    commentsCount,
                    likesCount,
                };
            })
        );

        return res.status(200).json({
            blogs: blogsWithCounts,
            currentPage: page,
            totalPages: limit > 0 ? Math.ceil(totalBlogs / limit) : 1,
        });
    } catch (error) {
        console.log("Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Get Blog by ID
export const getBlogById = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const blog = await Blog.findById(id).populate(
            "author",
            "username email profilePicture"
        );

        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }

        const commentsCount = await Comment.countDocuments({ blog: id });
        const likesCount = await Like.countDocuments({ blog: id });

        return res.status(200).json({
            blog: {
                ...blog.toObject(),
                commentsCount,
                likesCount,
            },
        });
    } catch (error) {
        console.log("Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Update Blog with Image
export const updateBlog = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description } = req.body;
    const file = req.file;

    try {
        const blog = await Blog.findById(id);
        if (!blog) {
            if (file) deleteImage(`/uploads/blogs/${file.filename}`);
            return res.status(404).json({ message: "Blog not found" });
        }

        // If new image uploaded, delete old one
        if (file && blog.imageUrl) {
            deleteImage(blog.imageUrl);
        }

        const updateData: any = {};
        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (file) updateData.imageUrl = getImageUrl(file.filename);

        const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        }).populate("author", "username email profilePicture");

        const commentsCount = await Comment.countDocuments({ blog: id });
        const likesCount = await Like.countDocuments({ blog: id });

        return res.status(200).json({
            message: "Blog updated successfully",
            blog: {
                ...updatedBlog?.toObject(),
                commentsCount,
                likesCount,
            },
        });
    } catch (error) {
        if (file) deleteImage(`/uploads/blogs/${file.filename}`);
        console.log("Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Delete Blog
export const deleteBlog = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }

        // Delete blog image from disk
        if (blog.imageUrl) {
            deleteImage(blog.imageUrl);
        }

        // Delete associated comments and likes
        await Comment.deleteMany({ blog: id });
        await Like.deleteMany({ blog: id });

        await Blog.findByIdAndDelete(id);

        return res.status(200).json({ message: "Blog deleted successfully" });
    } catch (error) {
        console.log("Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Get Blogs by User
export const getBlogsByUser = async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        const blogs = await Blog.find({ author: userId })
            .populate("author", "username email profilePicture")
            .sort({ createdAt: -1 });

        const blogsWithCounts = await Promise.all(
            blogs.map(async (blog) => {
                const commentsCount = await Comment.countDocuments({ blog: blog._id });
                const likesCount = await Like.countDocuments({ blog: blog._id });
                return {
                    ...blog.toObject(),
                    commentsCount,
                    likesCount,
                };
            })
        );

        return res.status(200).json({ blogs: blogsWithCounts });
    } catch (error) {
        console.log("Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};