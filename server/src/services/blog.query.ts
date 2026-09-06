import { Types, type PipelineStage } from "mongoose";

// Extracted from blog.controller so the admin list can reuse it rather than keeping a second,
// slower copy: the admin dashboard previously ran two countDocuments *per row* in a Promise.all
// over the whole collection.

const PUBLIC_AUTHOR_FIELDS = { username: 1, profilePicture: 1 } as const;

// The admin table shows who owns a row and whether they are staff. Kept as an explicit opt-in so
// widening it here can never silently widen the public list — the two call sites differ by one
// argument and the default is the narrow one.
export const ADMIN_AUTHOR_FIELDS = {
    username: 1,
    profilePicture: 1,
    email: 1,
    role: 1,
} as const;

// A list row carries a 200-character excerpt instead of the full body. $substrCP slices raw
// markdown, so `## Building **things**` would reach the client verbatim — stripped here rather
// than in the component, so every consumer gets clean text and none of them repeat the regex.
export const EXCERPT_CHARS = 200;

export const stripMarkdown = (s: string): string =>
    s
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`([^`]*)`/g, "$1")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/^\s{0,3}#{1,6}\s+/gm, "")
        .replace(/^\s{0,3}>\s?/gm, "")
        .replace(/[*_~]/g, "")
        .replace(/\s+/g, " ")
        .trim();

// The stages that turn a raw blog into what a client needs: author, counts and the viewer's own
// like. Shared by the list, the single read and the admin table so the shapes cannot drift apart.
export const enrichStages = (
    viewerId: Types.ObjectId | null,
    forList: boolean,
    authorFields: Record<string, 1> = PUBLIC_AUTHOR_FIELDS as unknown as Record<string, 1>
): PipelineStage[] => [
    {
        $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "author",
            pipeline: [{ $project: authorFields }],
        },
    },
    // An author whose account was deleted must not drop the post out of the list.
    { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },
    {
        $lookup: {
            from: "comments",
            localField: "_id",
            foreignField: "blog",
            as: "c",
            pipeline: [{ $count: "n" }],
        },
    },
    {
        $lookup: {
            from: "likes",
            localField: "_id",
            foreignField: "blog",
            as: "l",
            pipeline: [{ $count: "n" }],
        },
    },
    ...(viewerId
        ? [
              {
                  $lookup: {
                      from: "likes",
                      let: { b: "$_id" },
                      as: "mine",
                      pipeline: [
                          {
                              $match: {
                                  $expr: {
                                      $and: [
                                          { $eq: ["$blog", "$$b"] },
                                          { $eq: ["$user", viewerId] },
                                      ],
                                  },
                              },
                          },
                          { $limit: 1 },
                          { $project: { _id: 1 } },
                      ],
                  },
              } as PipelineStage,
          ]
        : []),
    {
        $addFields: {
            commentsCount: { $ifNull: [{ $first: "$c.n" }, 0] },
            likesCount: { $ifNull: [{ $first: "$l.n" }, 0] },
            likedByMe: viewerId ? { $gt: [{ $size: "$mine" }, 0] } : false,
            // Computed here because a list row does not carry the body it would be derived from.
            // 220 wpm, floored at one minute.
            readingMinutes: {
                $max: [
                    1,
                    { $ceil: { $divide: [{ $size: { $split: [{ $trim: { input: "$description" } }, " "] } }, 220] } },
                ],
            },
            ...(forList ? { excerpt: { $substrCP: ["$description", 0, EXCERPT_CHARS * 3] } } : {}),
        },
    },
    // All-exclusion projection, so it may name fields that were never added.
    { $project: { c: 0, l: 0, mine: 0, _score: 0, ...(forList ? { description: 0 } : {}) } },
];

// A user-supplied search string reaching `new RegExp` verbatim lets a caller inject metacharacters
// — at best a wrong result, at worst a catastrophically backtracking pattern that pins the event
// loop. Every admin search goes through this.
export const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
