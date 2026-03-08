import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
    blog: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Blog",
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, {
    timestamps: true
});

// Prevent duplicate likes (one user can only like a blog once)
likeSchema.index({ blog: 1, user: 1 }, { unique: true });

const Like = mongoose.model("Like", likeSchema);

export default Like;