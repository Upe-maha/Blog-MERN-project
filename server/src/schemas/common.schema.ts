import { z } from "zod";

export const objectIdString = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

// Shared by every route addressed to one blog — comments and likes both hang off /blog/:blogId.
export const blogIdParam = z.object({ blogId: objectIdString });

// A factory, not a constant: the bounds are the same everywhere but the sensible page size is not
// (20 comments reads well, 20 likers is a different judgement). Every list route must have one —
// an unbounded `limit` is a trivial DoS primitive, and a negative `page` produces a negative $skip
// that Mongo rejects as a 500 rather than the 400 it should be.
export const paginationQuery = (defaultLimit: number) =>
    z.object({
        page: z.coerce.number().int().min(1).max(10_000).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(defaultLimit),
    });

export type BlogIdParam = z.output<typeof blogIdParam>;
