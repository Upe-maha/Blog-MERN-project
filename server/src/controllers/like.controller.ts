import { Types } from "mongoose";
import Like from "../models/like.js";
import Blog from "../models/blog.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notFound, unauthorized } from "../utils/AppError.js";
import type { BlogIdParam, ListLikesQuery } from "../schemas/index.js";

// POST /api/likes/:blogId/toggle
//
// One endpoint, not a like/unlike pair. The old pair read `userId` from the body — so anyone could
// like as anyone — and `likeBlog` ran findOne-then-create with a TOCTOU window between them: two
// concurrent clicks both saw "not liked", both inserted, and the unique index fired E11000 as an
// unhandled 500.
//
// findOneAndDelete and the upsert are each a single atomic document operation, so the race cannot
// happen. If a duplicate still slips through, the error middleware renders E11000 as a 409.
export const toggleLike = asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const { blogId } = req.valid.params as BlogIdParam;
    const userId = req.user.userId;

    // exists() rather than findById: nothing here reads a field off the blog, so there is no reason
    // to pull a 20 KB markdown body across the wire to answer a yes/no question.
    if (!(await Blog.exists({ _id: blogId }))) throw notFound("Blog not found");

    const removed = await Like.findOneAndDelete({ blog: blogId, user: userId });
    if (!removed) {
        await Like.updateOne(
            { blog: blogId, user: userId },
            { $setOnInsert: { blog: blogId, user: userId } },
            { upsert: true }
        );
    }

    // The authoritative count comes back with the toggle. Without it the client increments its own
    // number and drifts away from reality the moment anyone else likes the same post.
    const likesCount = await Like.countDocuments({ blog: blogId });

    // Per-user state: never cacheable, by any shared cache.
    res.set("Cache-Control", "private, no-store");
    res.status(200).json({ liked: !removed, likesCount });
});

// GET /api/likes/me/:blogId
//
// The viewer's own state only. The route it replaces took the user id from the URL, so any caller
// could ask whether any other account had liked a post.
//
// The blog list and detail responses already carry `likedByMe`, but the client cannot rely on that
// here: those pages are fetched by a server component with no token and cached for everyone, so
// their likedByMe is always false. This is where a signed-in reader's real state comes from.
export const getMyLike = asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const { blogId } = req.valid.params as BlogIdParam;

    const [liked, likesCount] = await Promise.all([
        Like.exists({ blog: blogId, user: req.user.userId }),
        Like.countDocuments({ blog: blogId }),
    ]);

    res.set("Cache-Control", "private, no-store");
    res.status(200).json({ liked: !!liked, likesCount });
});

// GET /api/likes/blog/:blogId — who liked this post. Public, and paginated: it previously populated
// every liker on the post in a single unbounded response.
export const getLikesByBlog = asyncHandler(async (req, res) => {
    const { blogId } = req.valid.params as BlogIdParam;
    const { page, limit } = req.valid.query as ListLikesQuery;

    const skip = (page - 1) * limit;
    const filter = { blog: new Types.ObjectId(blogId) };

    const [likes, total] = await Promise.all([
        Like.find(filter)
            .populate("user", "username profilePicture")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Like.countDocuments(filter),
    ]);

    res.status(200).json({ likes, page, limit, total, hasMore: skip + likes.length < total });
});
