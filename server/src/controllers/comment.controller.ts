import Comment from "../models/comment.js";
import Blog from "../models/blog.js";

// Add comment
export const addComment = async (req: any, res: any) => {
    const { blogId, userId, content } = req.body;

    if (!blogId || !userId || !content) {
        return res.status(400).json({ message: "Blog ID, User ID, and content are required" });
    }

    try {
        const blog = await Blog.findById(blogId);
        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }

        const newComment = new Comment({
            blog: blogId,
            user: userId,
            content
        });

        await newComment.save();

        // Update comments count
        await Blog.findByIdAndUpdate(blogId, { $inc: { commentsCount: 1 } });

        const populatedComment = await Comment.findById(newComment._id)
            .populate("user", "username profilePicture");

        return res.status(201).json({ message: "Comment added successfully", comment: populatedComment });
    } catch (error) {
        console.log("Error:", error);
        return res.status(500).json({ message: "Internal server error from addComment" });
    }
};

// Get comments by blog ID
export const getCommentsByBlog = async (req: any, res: any) => {
    const { blogId } = req.params;

    try {
        const comments = await Comment.find({ blog: blogId })
            .populate("user", "username profilePicture")
            .sort({ createdAt: -1 });

        return res.status(200).json({ comments });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error from getCommentsByBlog" });
    }
};

// Delete comment
export const deleteComment = async (req: any, res: any) => {
    const { id } = req.params;

    try {
        const comment = await Comment.findById(id);

        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        await Comment.findByIdAndDelete(id);

        // Update comments count
        await Blog.findByIdAndUpdate(comment.blog, { $inc: { commentsCount: -1 } });

        return res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error from deleteComment" });
    }
};

// Update comment
export const updateComment = async (req: any, res: any) => {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: "Content is required" });
    }

    try {
        const updatedComment = await Comment.findByIdAndUpdate(
            id,
            { content },
            { new: true }
        ).populate("user", "username profilePicture");

        if (!updatedComment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        return res.status(200).json({ message: "Comment updated successfully", comment: updatedComment });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error from updateComment" });
    }
};