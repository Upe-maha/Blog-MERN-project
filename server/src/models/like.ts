import mongoose, { Document, Types } from "mongoose";

export interface ILike extends Document {
    blog: Types.ObjectId;
    user: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const likeSchema = new mongoose.Schema<ILike>(
    {
        blog: { type: mongoose.Schema.Types.ObjectId, ref: "Blog", required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

// Prevent duplicate likes. This is also what makes Phase 4's atomic toggle safe under concurrency.
likeSchema.index({ blog: 1, user: 1 }, { unique: true });
likeSchema.index({ user: 1 });

// getLikesByBlog pages "who liked this", newest first. The unique {blog,user} index above answers
// the toggle and the count, but it cannot supply that ordering — without this the sort ran in
// memory over every like on the post.
likeSchema.index({ blog: 1, createdAt: -1 });

const Like = mongoose.model<ILike>("Like", likeSchema);

export default Like;
