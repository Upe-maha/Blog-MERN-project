import express from "express";
import {
    addComment,
    getCommentsByBlog,
    deleteComment,
    updateComment,
} from "../controllers/comment.controller.js";
import Comment from "../models/comment.js";
import { authenticate } from "../middleware/auth.middleware.js";
import {
    requireCommentDeletePermission,
    requireOwnership,
} from "../middleware/ownership.middleware.js";
import { writeLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import {
    blogIdParam,
    commentBodySchema,
    listCommentsQuery,
    objectIdParam,
} from "../schemas/index.js";

const commentRouter = express.Router();

// The blog is the URL and the author is the token, so neither can be forged in the body. This is
// why POST moved off "/" — a comment has to be addressed to something, and the old shape let the
// target and the identity both arrive as untrusted JSON.
commentRouter.get(
    "/blog/:blogId",
    validate({ params: blogIdParam, query: listCommentsQuery }),
    getCommentsByBlog
);

commentRouter.post(
    "/blog/:blogId",
    authenticate,
    writeLimiter,
    validate({ params: blogIdParam, body: commentBodySchema }),
    addComment
);

// PATCH, not PUT: the body is a partial update of one field, never a replacement of the row.
//
// allowAdmin:false is deliberate and the one place this router departs from the default. Editing
// rewrites text that stays published under someone else's name — an admin who dislikes a comment
// can remove it, but must not be able to put words in its author's mouth.
commentRouter.patch(
    "/:id",
    authenticate,
    validate({ params: objectIdParam, body: commentBodySchema }),
    requireOwnership(Comment, "user", { allowAdmin: false }),
    updateComment
);

// Deleting, unlike editing, also belongs to the blog's author (moderating their own post) and to
// an admin.
commentRouter.delete(
    "/:id",
    authenticate,
    validate({ params: objectIdParam }),
    requireCommentDeletePermission,
    deleteComment
);

export default commentRouter;
