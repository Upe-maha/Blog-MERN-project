import express from "express";
import {
    likeBlog,
    unlikeBlog,
    getLikesByBlog,
    checkUserLike
} from "../controllers/like.controller.js";

const likeRouter = express.Router();

// POST like a blog
likeRouter.post("/", likeBlog);

// POST unlike a blog
likeRouter.post("/unlike", unlikeBlog);

// GET likes by blog ID
likeRouter.get("/blog/:blogId", getLikesByBlog);

// GET check if user liked a blog
likeRouter.get("/check/:blogId/:userId", checkUserLike);

export default likeRouter;