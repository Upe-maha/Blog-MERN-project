import express from "express";
import {
    createBlog,
    getAllBlogs,
    getBlogById,
    getBlogsForSitemap,
    suggestBlogs,
    updateBlog,
    deleteBlog,
} from "../controllers/blog.controller.js";
import Blog from "../models/blog.js";
import { uploadBlogImage } from "../config/multer.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.middleware.js";
import { requireOwnership } from "../middleware/ownership.middleware.js";
import { writeLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import {
    createBlogSchema,
    listBlogsQuery,
    objectIdParam,
    suggestBlogsQuery,
    updateBlogSchema,
} from "../schemas/index.js";

const blogRouter = express.Router();

// Public reads, but optionalAuthenticate so a signed-in viewer gets `likedByMe` without the route
// becoming private.
blogRouter.get("/", optionalAuthenticate, validate({ query: listBlogsQuery }), getAllBlogs);
// Must precede "/:id", which would otherwise swallow the literal path.
blogRouter.get("/sitemap", getBlogsForSitemap);
// Same ordering rule. No optionalAuthenticate: a suggestion list is six titles with nothing
// per-user in it, so reading a token would only make an otherwise shareable response private.
blogRouter.get("/suggest", validate({ query: suggestBlogsQuery }), suggestBlogs);
blogRouter.get("/:id", optionalAuthenticate, validate({ params: objectIdParam }), getBlogById);

blogRouter.post(
    "/",
    authenticate,
    writeLimiter,
    uploadBlogImage,
    validate({ body: createBlogSchema }),
    createBlog
);

// Order matters: ownership is proven before multer buffers a single byte, so a stranger's PUT
// cannot be used to write files to disk. Body validation still has to follow multer, because with
// multipart/form-data req.body is empty until it has parsed.
blogRouter.put(
    "/:id",
    authenticate,
    validate({ params: objectIdParam }),
    requireOwnership(Blog, "author"),
    uploadBlogImage,
    validate({ body: updateBlogSchema }),
    updateBlog
);

blogRouter.delete(
    "/:id",
    authenticate,
    validate({ params: objectIdParam }),
    requireOwnership(Blog, "author"),
    deleteBlog
);

export default blogRouter;
