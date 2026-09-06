import type { RequestHandler } from "express";
import type { Model, Types } from "mongoose";
import Comment from "../models/comment.js";
import Blog from "../models/blog.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { forbidden, notFound, unauthorized } from "../utils/AppError.js";
import { requireObjectId } from "../utils/objectId.js";

// The reusable chain link for "you may only edit your own row". Must be mounted after
// authenticate(), which is what populates req.user.
//
// Order matters: 404 before 403. Answering 403 for a document that does not exist would let a
// caller probe which ids are real.
export const requireOwnership = <TDoc>(
    model: Model<TDoc>,
    ownerField: string,
    { param = "id", allowAdmin = true }: { param?: string; allowAdmin?: boolean } = {}
): RequestHandler =>
    asyncHandler(async (req, _res, next) => {
        if (!req.user) throw unauthorized();

        const id = requireObjectId(req.params[param], "id");

        // lean<...>() rather than a cast: the projection only returns the owner field, so the
        // document's real shape is not what comes back here.
        const doc = await model
            .findById(id)
            .select(ownerField)
            .lean<Record<string, unknown> | null>();
        if (!doc) throw notFound();

        // The owner field may be a populated doc or a raw ObjectId; String() normalises both.
        const owner = String(doc[ownerField]);
        if (owner !== req.user.userId && !(allowAdmin && req.user.role === "admin")) {
            throw forbidden();
        }

        next();
    });

// Deleting a comment has three legitimate principals, which requireOwnership's single ownerField
// cannot express: the comment's author, the author of the blog it sits under (moderating your own
// post), and an admin. Same 404-before-403 ordering, for the same reason.
export const requireCommentDeletePermission: RequestHandler = asyncHandler(
    async (req, _res, next) => {
        if (!req.user) throw unauthorized();

        const id = requireObjectId(req.params.id, "comment id");

        const comment = await Comment.findById(id)
            .select("user blog")
            .lean<{ user: Types.ObjectId; blog: Types.ObjectId } | null>();
        if (!comment) throw notFound("Comment not found");

        const { userId, role } = req.user;
        if (role === "admin" || String(comment.user) === userId) return next();

        // The blog is only read for the moderation case, so the common path — deleting your own
        // comment — still costs exactly one query.
        const blog = await Blog.findById(comment.blog)
            .select("author")
            .lean<{ author: Types.ObjectId } | null>();
        if (blog && String(blog.author) === userId) return next();

        throw forbidden();
    }
);
