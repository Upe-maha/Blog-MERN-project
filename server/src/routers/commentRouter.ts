import express from "express";
import {
    addComment,
    getCommentsByBlog,
    deleteComment,
    updateComment
} from "../controllers/comment.controller.js";

const commentRouter = express.Router();

// POST add comment
commentRouter.post("/", addComment);

// GET comments by blog ID
commentRouter.get("/blog/:blogId", getCommentsByBlog);

// PUT update comment
commentRouter.put("/:id", updateComment);

// DELETE comment
commentRouter.delete("/:id", deleteComment);

export default commentRouter;