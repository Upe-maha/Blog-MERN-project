import mongoose, { Document, Types } from "mongoose";

export interface IComment extends Document {
    blog: Types.ObjectId;
    user: Types.ObjectId;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

const commentSchema = new mongoose.Schema<IComment>(
    {
        blog: { type: mongoose.Schema.Types.ObjectId, ref: "Blog", required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        content: { type: String, required: true, trim: true, maxlength: 2000 },
    },
    { timestamps: true }
);

// The hottest query in the app: comments for one blog, newest first.
commentSchema.index({ blog: 1, createdAt: -1 });
commentSchema.index({ user: 1 });

const Comment = mongoose.model<IComment>("Comment", commentSchema);

export default Comment;
