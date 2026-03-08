import Like from "../models/like.js";
import Blog from "../models/blog.js";

// Like a blog
export const likeBlog = async (req: any, res: any) => {
    const { blogId, userId } = req.body;

    if (!blogId || !userId) {
        return res.status(400).json({ message: "Blog ID and User ID are required" });
    }

    try {
        const blog = await Blog.findById(blogId);
        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }

        // Check if already liked
        const existingLike = await Like.findOne({ blog: blogId, user: userId });
        if (existingLike) {
            return res.status(400).json({ message: "You already liked this blog" });
        }

        const newLike = new Like({
            blog: blogId,
            user: userId
        });

        await newLike.save();

        // Update likes count
        await Blog.findByIdAndUpdate(blogId, { $inc: { likesCount: 1 } });

        return res.status(201).json({ message: "Blog liked successfully" });
    } catch (error) {
        console.log("Error:", error);
        return res.status(500).json({ message: "Internal server error from likeBlog" });
    }
};

// Unlike a blog
export const unlikeBlog = async (req: any, res: any) => {
    const { blogId, userId } = req.body;

    if (!blogId || !userId) {
        return res.status(400).json({ message: "Blog ID and User ID are required" });
    }

    try {
        const existingLike = await Like.findOne({ blog: blogId, user: userId });

        if (!existingLike) {
            return res.status(400).json({ message: "You haven't liked this blog" });
        }

        await Like.findByIdAndDelete(existingLike._id);

        // Update likes count
        await Blog.findByIdAndUpdate(blogId, { $inc: { likesCount: -1 } });

        return res.status(200).json({ message: "Blog unliked successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error from unlikeBlog" });
    }
};

// Get likes by blog ID
export const getLikesByBlog = async (req: any, res: any) => {
    const { blogId } = req.params;

    try {
        const likes = await Like.find({ blog: blogId })
            .populate("user", "username profilePicture");

        return res.status(200).json({ likes, count: likes.length });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error from getLikesByBlog" });
    }
};

// Check if user liked a blog
export const checkUserLike = async (req: any, res: any) => {
    const { blogId, userId } = req.params;

    try {
        const like = await Like.findOne({ blog: blogId, user: userId });

        return res.status(200).json({ liked: !!like });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error from checkUserLike" });
    }
};