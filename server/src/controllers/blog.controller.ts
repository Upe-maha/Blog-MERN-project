import { Types, type PipelineStage } from "mongoose";
import Blog from "../models/blog.js";
import Comment from "../models/comment.js";
import Like from "../models/like.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notFound, unauthorized } from "../utils/AppError.js";
import { persistUpload, removeStored, keepUpload } from "../config/imageStorage.js";
import { withTransaction } from "../utils/withTransaction.js";
import { enrichStages, escapeRegex, stripMarkdown, EXCERPT_CHARS } from "../services/blog.query.js";
import type {
    CreateBlogInput,
    ListBlogsQuery,
    ObjectIdParam,
    SuggestBlogsQuery,
    UpdateBlogInput,
} from "../schemas/index.js";

const AUTHOR_FIELDS = "username profilePicture";

// Anonymous responses are identical for every caller, so a shared cache can serve them. A response
// carrying likedByMe is per-user and must never be cached.
const setListCache = (req: { user?: unknown }, res: { set: (k: string, v: string) => void }) => {
    if (!req.user) {
        res.set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
    } else {
        res.set("Cache-Control", "private, no-store");
    }
};

// GET /api/blogs
export const getAllBlogs = asyncHandler(async (req, res) => {
    const { page, limit, q, author, after } = req.valid.query as ListBlogsQuery;

    const viewerId = req.user ? new Types.ObjectId(req.user.userId) : null;

    // "me" saves the client from reading its own id out of the auth store to ask for its own posts.
    let authorId: Types.ObjectId | null = null;
    if (author === "me") {
        if (!req.user) throw unauthorized();
        authorId = new Types.ObjectId(req.user.userId);
    } else if (author) {
        authorId = new Types.ObjectId(author);
    }

    const match: Record<string, unknown> = {};
    if (q) match.$text = { $search: q };
    if (authorId) match.author = authorId;

    // The cursor path: seek past everything already rendered rather than counting it. Skips the
    // $facet entirely, so the total is not computed — an infinite feed never displays one, and
    // computing it forces every matching document through the cursor just to be counted.
    //
    // Not combined with $text: a text search is ranked by score, and a createdAt cursor cannot
    // seek into a relevance ordering.
    if (after && !q) {
        const rows = await Blog.aggregate([
            { $match: { ...match, createdAt: { $lt: after } } },
            { $sort: { createdAt: -1 } },
            { $limit: limit + 1 }, // one extra row is how we know there is a next page
            ...enrichStages(viewerId, true),
        ] as PipelineStage[]);

        const hasMore = rows.length > limit;
        const pageRows: Record<string, unknown>[] = (hasMore ? rows.slice(0, limit) : rows).map(
            (row: Record<string, unknown>) => ({
                ...row,
                excerpt: stripMarkdown(String(row.excerpt ?? "")).slice(0, EXCERPT_CHARS),
            })
        );

        setListCache(req, res);
        res.status(200).json({
            blogs: pageRows,
            limit,
            hasMore,
            // The caller passes this straight back as ?after= for the next page.
            nextCursor: hasMore ? (pageRows.at(-1)?.createdAt ?? null) : null,
        });
        return;
    }

    const [result] = await Blog.aggregate([
        { $match: match },
        ...(q ? [{ $addFields: { _score: { $meta: "textScore" } } }] : []),
        { $sort: q ? { _score: -1, createdAt: -1 } : { createdAt: -1 } },
        {
            $facet: {
                total: [{ $count: "n" }],
                rows: [
                    { $skip: (page - 1) * limit },
                    { $limit: limit },
                    ...enrichStages(viewerId, true),
                ],
            },
        },
    ] as PipelineStage[]);

    const total: number = result?.total?.[0]?.n ?? 0;
    const rows = (result?.rows ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        excerpt: stripMarkdown(String(row.excerpt ?? "")).slice(0, EXCERPT_CHARS),
    }));

    setListCache(req, res);
    res.status(200).json({
        blogs: rows,
        page,
        limit,
        total,
        // currentPage/totalPages are kept because the admin and profile tables read them;
        // page/total/hasMore are the shape new code should use.
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasMore: page * limit < total,
        // Handed back so a caller can switch to the cursor for the *next* page without having to
        // reach into the last row itself. Absent on a text search, where the ordering is by
        // relevance and a date cursor cannot seek into it.
        nextCursor: q ? null : ((rows.at(-1) as { createdAt?: string } | undefined)?.createdAt ?? null),
    });
});

// GET /api/blogs/suggest
//
// The search box's autocomplete. Deliberately not a call to getAllBlogs with a small limit: that
// runs the whole $facet enrichment — author lookup, comment and like counts, excerpt stripping —
// to render six titles, and it fires on every debounce tick as somebody types.
//
// Two queries, not one, because the $text index and a prefix match answer genuinely different
// questions and neither subsumes the other:
//
//   - $text matches whole stemmed words anywhere in the title or body, so "hooks" finds
//     "Thinking in React Hooks" but "hoo" finds nothing.
//   - An anchored regex on titleLower matches what someone has typed *so far*, so "thinking in r"
//     finds it before the word is complete — which is the entire point of an autocomplete.
//
// Both are index-backed (blog_text and titleLower_1); a substring regex would answer both at once
// and is precisely what no index can serve. Prefix hits are listed first because a title the
// reader is visibly partway through typing is a better guess than a relevance score.
export const suggestBlogs = asyncHandler(async (req, res) => {
    const { q, limit } = req.valid.query as SuggestBlogsQuery;

    const [prefix, text] = await Promise.all([
        Blog.find({ titleLower: { $regex: `^${escapeRegex(q.toLowerCase())}` } })
            .select("_id title")
            .sort({ titleLower: 1 })
            .limit(limit)
            .lean(),
        Blog.find({ $text: { $search: q } }, { score: { $meta: "textScore" } })
            .select("_id title")
            .sort({ score: { $meta: "textScore" } })
            .limit(limit)
            .lean(),
    ]);

    const seen = new Set<string>();
    const suggestions = [...prefix, ...text]
        .filter((b) => {
            const id = String(b._id);
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        })
        .slice(0, limit)
        // score is a projection artefact of the $text branch and has no business in the response.
        .map((b) => ({ _id: String(b._id), title: b.title }));

    // Anonymous and identical for every caller — the same shared-cache terms the list uses. There
    // is no likedByMe here and no token is read, so there is nothing per-user to leak.
    res.set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
    res.status(200).json({ suggestions });
});

// GET /api/blogs/sitemap
//
// Ids and timestamps only. The sitemap needs neither the author lookup, the comment and like
// counts, nor a markdown-stripped excerpt, and running the full aggregation over every post to
// throw all of it away is the expensive way to build one. No cap either: a sitemap that stops at
// 50 posts is a sitemap that hides the rest of the site from crawlers.
export const getBlogsForSitemap = asyncHandler(async (_req, res) => {
    const blogs = await Blog.find()
        .select("_id updatedAt")
        .sort({ updatedAt: -1 })
        .limit(50_000) // the sitemap.xml spec's own ceiling
        .lean();

    res.set("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json({ blogs });
});

// GET /api/blogs/:id
export const getBlogById = asyncHandler(async (req, res) => {
    const { id } = req.valid.params as ObjectIdParam;
    const viewerId = req.user ? new Types.ObjectId(req.user.userId) : null;

    const [blog] = await Blog.aggregate([
        { $match: { _id: new Types.ObjectId(id) } },
        ...enrichStages(viewerId, false),
    ] as PipelineStage[]);

    if (!blog) throw notFound("Blog not found");

    setListCache(req, res);
    res.status(200).json({ blog });
});

// POST /api/blogs
export const createBlog = asyncHandler(async (req, res) => {
    const { title, description } = req.valid.body as CreateBlogInput;

    // The single most important line in this phase: authorship comes from the verified token, and
    // an `author` field in the body is stripped by the schema before it ever gets here.
    const author = req.user!.userId;

    const stored = req.file ? await persistUpload(req.file, "blogs") : null;

    const newBlog = await Blog.create({
        title,
        description,
        imageUrl: stored?.url ?? "",
        imagePublicId: stored?.publicId,
        author,
    });
    keepUpload(req);

    await newBlog.populate("author", AUTHOR_FIELDS);

    res.status(201).json({
        message: "Blog created successfully",
        blog: { ...newBlog.toObject(), commentsCount: 0, likesCount: 0, likedByMe: false },
    });
});

// PUT /api/blogs/:id — requireOwnership has already proven the caller owns this row.
export const updateBlog = asyncHandler(async (req, res) => {
    const { id } = req.valid.params as ObjectIdParam;
    const { title, description } = req.valid.body as UpdateBlogInput;

    const blog = await Blog.findById(id).select("imageUrl imagePublicId").lean();
    if (!blog) throw notFound("Blog not found");

    // Captured before the write, deleted after it — see below.
    const previousImage = { url: blog.imageUrl, publicId: blog.imagePublicId };
    const stored = req.file ? await persistUpload(req.file, "blogs") : null;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (stored) {
        updateData.imageUrl = stored.url;
        updateData.imagePublicId = stored.publicId;
    }

    const updated = await Blog.findByIdAndUpdate(id, updateData, {
        returnDocument: "after",
        runValidators: true,
    }).populate("author", AUTHOR_FIELDS);
    if (!updated) throw notFound("Blog not found");
    keepUpload(req);

    // Only once the write has succeeded. Deleting first would destroy the image on a failed update
    // while the row still pointed at it.
    if (stored) await removeStored(previousImage);

    const [commentsCount, likesCount] = await Promise.all([
        Comment.countDocuments({ blog: id }),
        Like.countDocuments({ blog: id }),
    ]);

    res.status(200).json({
        message: "Blog updated successfully",
        blog: { ...updated.toObject(), commentsCount, likesCount },
    });
});

// DELETE /api/blogs/:id — requireOwnership has already proven the caller owns this row.
export const deleteBlog = asyncHandler(async (req, res) => {
    const { id } = req.valid.params as ObjectIdParam;

    const blog = await Blog.findById(id).select("imageUrl imagePublicId").lean();
    if (!blog) throw notFound("Blog not found");

    await withTransaction(async (session) => {
        // A ClientSession is not concurrency-safe, so these run in sequence rather than Promise.all.
        await Comment.deleteMany({ blog: id }, { session });
        await Like.deleteMany({ blog: id }, { session });
        await Blog.deleteOne({ _id: id }, { session });
    });

    // Outside the transaction, and last: a Cloudinary delete cannot be rolled back, so an
    // aborted transaction must not have destroyed the image of a post that still exists.
    await removeStored({ url: blog.imageUrl, publicId: blog.imagePublicId });

    res.status(200).json({ message: "Blog deleted successfully" });
});

// getBlogsByUser is gone. It was exported but never routed, and its client counterpart called
// /blogs/user/:userId, which never existed. GET /api/blogs?author=<id> replaces it on the same
// aggregation, which means pagination and counts come for free.
