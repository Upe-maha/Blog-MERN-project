import Blog from "../models/blog.js";
import Comment from "../models/comment.js";
import Like from "../models/like.js";
import User from "../models/user.js";
import { removeStored } from "../config/imageStorage.js";
import { withTransaction } from "../utils/withTransaction.js";

// The dashboard is only reachable while an unblocked admin exists, and there is no route back
// short of running the seed script against the database by hand.
//
// The admin routes cannot break that invariant — each refuses to act on the caller's own account,
// so any admin they *can* target implies a second admin exists. Self-service deletion is the one
// path that can, because DELETE /users/me has no role check of its own.
export async function isLastAdmin(userId: string): Promise<boolean> {
    const user = await User.findById(userId).select("role").lean();
    if (user?.role !== "admin") return false;
    return (await User.countDocuments({ role: "admin" })) <= 1;
}

// Shared by DELETE /users/me and the admin delete, which previously carried two separate copies of
// this cascade — and the self-serve one deleted only the User row, orphaning every blog, comment
// and like the account had written.
//
// Returns false when there is no such user, so callers can render their own 404.
export async function deleteUserAndContent(userId: string): Promise<boolean> {
    const user = await User.findById(userId).select("profilePicture profilePicturePublicId").lean();
    if (!user) return false;

    const blogImages = await withTransaction(async (session) => {
        // A ClientSession is not concurrency-safe: two operations sharing one session must not be
        // in flight together, so these are sequential rather than Promise.all.
        const blogs = await Blog.find({ author: userId })
            .select("_id imageUrl imagePublicId")
            .session(session ?? null)
            .lean();
        const blogIds = blogs.map((b) => b._id);

        const filter = { $or: [{ blog: { $in: blogIds } }, { user: userId }] };
        await Comment.deleteMany(filter, { session });
        await Like.deleteMany(filter, { session });
        await Blog.deleteMany({ author: userId }, { session });
        await User.deleteOne({ _id: userId }, { session });

        return blogs.map((b) => ({ url: b.imageUrl, publicId: b.imagePublicId }));
    });

    // Files last, and outside the transaction: an unlink cannot be rolled back, so an abort would
    // leave the row restored but its image gone. An orphaned file is recoverable; a row pointing
    // at a deleted file is not.
    await Promise.all(
        [
            { url: user.profilePicture, publicId: user.profilePicturePublicId },
            ...blogImages,
        ].map((img) => removeStored(img))
    );

    return true;
}
