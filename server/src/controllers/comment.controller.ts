import Comment from "../models/comment.js";
import Blog from "../models/blog.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notFound, unauthorized } from "../utils/AppError.js";
import type {
    BlogIdParam,
    CommentBodyInput,
    ListCommentsQuery,
    ObjectIdParam,
} from "../schemas/index.js";

const USER_FIELDS = "username profilePicture";

export const addComment = asyncHandler(async (req, res) => {
    // authenticate() runs first, so this is only ever undefined if the route is misconfigured.
    if (!req.user) throw unauthorized();

    const { blogId } = req.valid.params as BlogIdParam;
    const { content } = req.valid.body as CommentBodyInput;

    // exists() rather than findById(): nothing here reads a field off the blog, and the index-only
    // lookup avoids pulling a 20 KB markdown body across the wire to answer a yes/no question.
    const blog = await Blog.exists({ _id: blogId });
    if (!blog) throw notFound("Blog not found");

    const comment = await Comment.create({ blog: blogId, user: req.user.userId, content });
    await comment.populate("user", USER_FIELDS);

    // The populated document goes back so the client can insert it optimistically rather than
    // refetching the whole list to display one new row.
    res.status(201).json({ message: "Comment added successfully", comment });
});

export const getCommentsByBlog = asyncHandler(async (req, res) => {
    const { blogId } = req.valid.params as BlogIdParam;
    const { page, limit } = req.valid.query as ListCommentsQuery;

    const skip = (page - 1) * limit;

    // Both halves hit the same { blog: 1, createdAt: -1 } index, and they are independent, so they
    // run concurrently rather than one after the other.
    const [comments, total] = await Promise.all([
        Comment.find({ blog: blogId })
            .populate("user", USER_FIELDS)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Comment.countDocuments({ blog: blogId }),
    ]);

    res.status(200).json({
        comments,
        page,
        limit,
        total,
        hasMore: skip + comments.length < total,
    });
});

export const updateComment = asyncHandler(async (req, res) => {
    // requireOwnership(Comment, "user") has already proven the row exists and belongs to the
    // caller, so a null result here would mean it was deleted in the microseconds between.
    const { id } = req.valid.params as ObjectIdParam;
    const { content } = req.valid.body as CommentBodyInput;

    const comment = await Comment.findByIdAndUpdate(
        id,
        { content },
        { new: true, runValidators: true }
    ).populate("user", USER_FIELDS);

    if (!comment) throw notFound("Comment not found");

    res.status(200).json({ message: "Comment updated successfully", comment });
});

export const deleteComment = asyncHandler(async (req, res) => {
    const { id } = req.valid.params as ObjectIdParam;

    // requireCommentDeletePermission proved existence and permission; this is the write.
    const comment = await Comment.findByIdAndDelete(id);
    if (!comment) throw notFound("Comment not found");

    res.status(200).json({ message: "Comment deleted successfully" });
});
