import { z } from "zod";
import { paginationQuery } from "./common.schema.js";

// The comment's target is the URL, and its author is the token. Neither is a body field any more —
// z.object strips both if a client sends them, so a forged `userId` cannot reach the model.
export const commentBodySchema = z.object({
    content: z
        .string()
        .trim()
        .min(1, "Write something first")
        .max(2000, "A comment must be at most 2,000 characters"),
});

// getCommentsByBlog had no pagination at all before Phase 3, so a popular post returned every
// comment ever written in one response.
export const listCommentsQuery = paginationQuery(20);

export type CommentBodyInput = z.output<typeof commentBodySchema>;
export type ListCommentsQuery = z.output<typeof listCommentsQuery>;
