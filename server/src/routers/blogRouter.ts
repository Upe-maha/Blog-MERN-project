import express from "express";
import {
    createBlog,
    getAllBlogs,
    getBlogById,
    updateBlog,
    deleteBlog
} from "../controllers/blog.controller.js";
import { uploadBlogImage } from "../config/multer.js"; // <-- ADD THIS LINE

const blogRouter = express.Router();

// POST create blog (with image upload)
blogRouter.post("/", uploadBlogImage, createBlog);

// GET all blogs
blogRouter.get("/", getAllBlogs);

// GET blog by ID
blogRouter.get("/:id", getBlogById);

// PUT update blog (with image upload)
blogRouter.put("/:id", uploadBlogImage, updateBlog);

// DELETE blog
blogRouter.delete("/:id", deleteBlog);

export default blogRouter;