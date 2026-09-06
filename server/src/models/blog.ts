import mongoose, { Document, Types } from "mongoose";

export interface IBlog extends Document {
    title: string;
    // A lowercased mirror of `title`, never written by a caller and never returned to one. It
    // exists solely so the suggest endpoint's prefix match can be index-backed: an anchored regex
    // uses a btree index, but adding the `i` flag stops it doing so, and a case-sensitive prefix
    // over user-entered titles would only ever match the capitalisation the author happened to use.
    titleLower: string;
    description: string;
    imageUrl?: string;
    imagePublicId?: string;
    author: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// commentsCount / likesCount used to live here. They were written by four call sites, read by
// none, had no floor so they drifted negative, and cascade deletes never touched them. Both are
// computed from the Comment/Like collections instead.
const blogSchema = new mongoose.Schema<IBlog>(
    {
        title: { type: String, required: true, trim: true, maxlength: 200 },
        // Derived, not accepted: the hooks below are the only writers. `select: false` keeps it out
        // of every existing response, so no client type changes.
        titleLower: { type: String, select: false },
        description: { type: String, required: true, maxlength: 20000 },
        imageUrl: { type: String },
        // Deletion is by id, not URL: a Cloudinary URL carries transformation and version
        // segments and cannot be reversed into one.
        imagePublicId: { type: String },
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

// Keeps titleLower in step with title from both write paths. Two hooks rather than one because
// create()/save() and findByIdAndUpdate() do not share a middleware.
blogSchema.pre("save", function () {
    if (this.isModified("title")) this.titleLower = this.title.toLowerCase();
});

blogSchema.pre("findOneAndUpdate", function () {
    const update = this.getUpdate() as Record<string, unknown> | null;
    if (!update) return;
    // updateBlog builds a plain object, but a $set form is equally valid and must not silently
    // leave a stale titleLower behind.
    const target = ("$set" in update ? update.$set : update) as Record<string, unknown> | undefined;
    if (typeof target?.title === "string") target.titleLower = target.title.toLowerCase();
});

blogSchema.index({ createdAt: -1 });
// Backs the anchored prefix match in suggestBlogs. Anchored regexes are the one regex shape that
// can seek an index rather than scanning the collection.
blogSchema.index({ titleLower: 1 });
blogSchema.index({ author: 1, createdAt: -1 });

// Backs the $text stage in getAllBlogs. Title outweighs body 10:1 so a keyword in the headline
// ranks above the same word buried in a paragraph.
//
// Caveat: $text matches whole words with stemming, so "reac" will not find "React". That is why
// the suggest endpoint pairs this with an anchored prefix match on titleLower — the two cover
// different halves of what someone typing into the search box means, and both are index-backed.
// A substring regex would cover both at once and is exactly what neither index can serve.
blogSchema.index(
    { title: "text", description: "text" },
    { weights: { title: 10, description: 1 }, name: "blog_text" }
);

const Blog = mongoose.model<IBlog>("Blog", blogSchema);

export default Blog;
