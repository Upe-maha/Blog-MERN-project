import type { PipelineStage } from "mongoose";
import User from "../models/user.js";
import Blog from "../models/blog.js";
import Comment from "../models/comment.js";
import Like from "../models/like.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, notFound } from "../utils/AppError.js";
import { removeStored } from "../config/imageStorage.js";
import { withTransaction } from "../utils/withTransaction.js";
import { deleteUserAndContent } from "../services/user.service.js";
import {
    enrichStages,
    stripMarkdown,
    escapeRegex,
    ADMIN_AUTHOR_FIELDS,
    EXCERPT_CHARS,
} from "../services/blog.query.js";
import { logger } from "../utils/logger.js";
import type { AdminBlogsQuery, AdminUsersQuery, ObjectIdParam, SetRoleInput } from "../schemas/index.js";

// An allow-list, never select("-password"). Excluding one field still ships every field added
// later — a token, a reset secret — to whoever holds an admin session. Naming what an endpoint
// needs means a new column has to be opted into.
const ADMIN_USER_FIELDS = "username email profilePicture role isBlocked createdAt updatedAt";

// Every mutation below records who did what to whom. Cheap, and the first thing anyone asks for.
const audit = (req: { user?: { userId: string } }, action: string, targetId: string, extra = {}) =>
    logger.info({ actor: req.user?.userId, action, targetId, ...extra }, "admin action");

// NOTE on the "last admin" lockout: no route in this file can cause it. Each refuses to act on
// the caller's own account, so any admin they are able to target implies a second admin — the one
// making the request. A dedicated check here would be unreachable code.
//
// The path that *can* lock everyone out is DELETE /users/me, which has no role check of its own.
// isLastAdmin() in services/user.service.ts guards it there.

// GET /api/admin/users
export const getAllUsersAdmin = asyncHandler(async (req, res) => {
    const { page, limit, q, sort, role, blocked } = req.valid.query as AdminUsersQuery;

    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (blocked) filter.isBlocked = blocked === "true";
    if (q) {
        // Escaped: an unescaped search string is both a wrong-results bug and a ReDoS primitive.
        const rx = new RegExp(escapeRegex(q), "i");
        filter.$or = [{ username: rx }, { email: rx }];
    }

    const order: Record<string, Record<string, 1 | -1>> = {
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        username: { username: 1 },
        email: { email: 1 },
    };

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
        User.find(filter)
            .select(ADMIN_USER_FIELDS)
            .sort(order[sort])
            .skip(skip)
            .limit(limit)
            .lean(),
        User.countDocuments(filter),
    ]);

    res.set("Cache-Control", "private, no-store");
    res.status(200).json({ users, page, limit, total, hasMore: skip + users.length < total });
});

// PATCH /api/admin/users/:id/block
export const toggleBlockUser = asyncHandler(async (req, res) => {
    const { id } = req.valid.params as ObjectIdParam;

    if (req.user?.userId === id) throw badRequest("You cannot block your own account");

    // Read the flag, then flip it in one update. Loading the full document to mutate a boolean
    // pulled the password hash into memory and rewrote every path on save().
    const current = await User.findById(id).select("isBlocked").lean();
    if (!current) throw notFound("User not found");

    const user = await User.findByIdAndUpdate(
        id,
        { isBlocked: !current.isBlocked },
        { returnDocument: "after", runValidators: true }
    )
        .select(ADMIN_USER_FIELDS)
        .lean();
    if (!user) throw notFound("User not found");

    audit(req, user.isBlocked ? "block-user" : "unblock-user", id);

    res.status(200).json({
        message: user.isBlocked ? "User blocked successfully" : "User unblocked successfully",
        user,
    });
});

// POST /api/admin/users/:id/role — promote or demote.
//
// Exists because self-service admin registration is gone: registerSchema has no `role` key, so
// without this the only way to make an admin is running the seed script on the server.
export const setUserRole = asyncHandler(async (req, res) => {
    const { id } = req.valid.params as ObjectIdParam;
    const { role } = req.valid.body as SetRoleInput;

    if (req.user?.userId === id) throw badRequest("You cannot change your own role");

    const user = await User.findByIdAndUpdate(
        id,
        { role },
        { returnDocument: "after", runValidators: true }
    )
        .select(ADMIN_USER_FIELDS)
        .lean();
    if (!user) throw notFound("User not found");

    audit(req, "set-role", id, { role });

    res.status(200).json({ message: `Role updated to ${role}`, user });
});

// DELETE /api/admin/users/:id — removes the user and everything they authored
export const deleteUserAdmin = asyncHandler(async (req, res) => {
    const { id } = req.valid.params as ObjectIdParam;

    if (req.user?.userId === id) throw badRequest("You cannot delete your own account");

    // Shares the transactional bulk cascade with DELETE /users/me rather than keeping a second
    // copy that awaited twice per blog in a loop.
    const deleted = await deleteUserAndContent(id);
    if (!deleted) throw notFound("User not found");

    audit(req, "delete-user", id);

    res.status(200).json({ message: "User and all associated content deleted" });
});

// GET /api/admin/blogs
export const getAllBlogsAdmin = asyncHandler(async (req, res) => {
    const { page, limit, q, sort } = req.valid.query as AdminBlogsQuery;

    const match: Record<string, unknown> = {};
    if (q) match.$text = { $search: q };

    const order: Record<string, Record<string, 1 | -1>> = {
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        title: { title: 1 },
        comments: { commentsCount: -1 },
        likes: { likesCount: -1 },
    };
    // commentsCount and likesCount only exist after enrichStages has added them, so sorting by
    // either has to happen inside the rows branch rather than before the $facet.
    const sortsOnComputed = sort === "comments" || sort === "likes";

    const [result] = await Blog.aggregate([
        { $match: match },
        ...(q ? [{ $addFields: { _score: { $meta: "textScore" } } }] : []),
        ...(sortsOnComputed ? [] : [{ $sort: q ? { _score: -1, createdAt: -1 } : order[sort] }]),
        {
            $facet: {
                total: [{ $count: "n" }],
                rows: sortsOnComputed
                    ? [
                          ...enrichStages(null, true, ADMIN_AUTHOR_FIELDS as unknown as Record<string, 1>),
                          { $sort: { ...order[sort], createdAt: -1 } },
                          { $skip: (page - 1) * limit },
                          { $limit: limit },
                      ]
                    : [
                          { $skip: (page - 1) * limit },
                          { $limit: limit },
                          ...enrichStages(null, true, ADMIN_AUTHOR_FIELDS as unknown as Record<string, 1>),
                      ],
            },
        },
    ] as PipelineStage[]);

    const total: number = result?.total?.[0]?.n ?? 0;
    const rows = (result?.rows ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        excerpt: stripMarkdown(String(row.excerpt ?? "")).slice(0, EXCERPT_CHARS),
    }));

    res.set("Cache-Control", "private, no-store");
    res.status(200).json({
        blogs: rows,
        page,
        limit,
        total,
        hasMore: page * limit < total,
    });
});

// DELETE /api/admin/blogs/:id
export const deleteAnyBlog = asyncHandler(async (req, res) => {
    const { id } = req.valid.params as ObjectIdParam;

    const blog = await Blog.findById(id).select("imageUrl imagePublicId").lean();
    if (!blog) throw notFound("Blog not found");

    await withTransaction(async (session) => {
        // A ClientSession is not concurrency-safe, so these run in sequence rather than Promise.all.
        await Comment.deleteMany({ blog: id }, { session });
        await Like.deleteMany({ blog: id }, { session });
        await Blog.deleteOne({ _id: id }, { session });
    });

    // Outside the transaction: a Cloudinary delete cannot be rolled back.
    await removeStored({ url: blog.imageUrl, publicId: blog.imagePublicId });

    audit(req, "delete-blog", id);

    res.status(200).json({ message: "Blog deleted successfully" });
});

// GET /api/admin/stats
export const getAdminStats = asyncHandler(async (_req, res) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // One $facet for everything derived from users — three passes over one collection instead of
    // three round trips — and a plain count for each of the other three collections.
    const [[userFacet], blogs, comments, likes] = await Promise.all([
        User.aggregate([
            {
                $facet: {
                    total: [{ $count: "n" }],
                    blocked: [{ $match: { isBlocked: true } }, { $count: "n" }],
                    admins: [{ $match: { role: "admin" } }, { $count: "n" }],
                    newUsers7d: [{ $match: { createdAt: { $gte: weekAgo } } }, { $count: "n" }],
                },
            },
        ]),
        Blog.estimatedDocumentCount(),
        Comment.estimatedDocumentCount(),
        Like.estimatedDocumentCount(),
    ]);

    const n = (key: string): number => userFacet?.[key]?.[0]?.n ?? 0;

    res.set("Cache-Control", "private, no-store");
    res.status(200).json({
        users: n("total"),
        blocked: n("blocked"),
        admins: n("admins"),
        newUsers7d: n("newUsers7d"),
        blogs,
        comments,
        likes,
    });
});
