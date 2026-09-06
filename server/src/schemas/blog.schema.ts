import { z } from "zod";

const objectIdString = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const createBlogSchema = z.object({
    title: z
        .string()
        .trim()
        .min(3, "Title must be at least 3 characters")
        .max(200, "Title must be at most 200 characters"),
    description: z
        .string()
        .trim()
        .min(10, "Body must be at least 10 characters")
        .max(20_000, "Body must be at most 20,000 characters"),
    // NOTE: no `author`. It comes from the verified token, and z.object strips the key if a client
    // sends one, so a forged author never reaches the model.
});

export const updateBlogSchema = createBlogSchema
    .partial()
    .refine((o) => Object.keys(o).length > 0, "Nothing to update");

// Every bound here is load-bearing. Before this, `?limit=1000000` was honoured verbatim (a trivial
// DoS primitive) and `?page=-5` produced a negative $skip, which Mongo rejects as a 500 rather than
// the 400 it should be.
export const listBlogsQuery = z.object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(9),
    q: z.string().trim().min(1).max(120).optional(),
    // "me" resolves to the caller's own id in the controller, so the profile page never has to
    // read an id out of the store to ask for its own posts.
    author: objectIdString.or(z.literal("me")).optional(),

    // Cursor pagination for the infinite feed: the createdAt of the last row already rendered.
    //
    // `skip` degrades linearly — page 50 makes Mongo walk 441 documents to hand back 9 — and it
    // also double-counts or skips rows when a post is published mid-scroll, because every later
    // page shifts by one. A createdAt cursor seeks straight into the index and is stable under
    // concurrent writes.
    //
    // `page` stays for the admin tables and the profile, where jumping to a numbered page is the
    // point. The two are mutually exclusive; `after` wins when both are sent.
    after: z.coerce.date().optional(),
});

// The suggest box fires on a debounce as somebody types, so its bounds are tighter than the list's:
// a short cap on the term and a hard ceiling of 10 rows. min(1) means an empty box never reaches
// Mongo at all — the client short-circuits too, but the endpoint is public and cannot rely on that.
export const suggestBlogsQuery = z.object({
    q: z.string().trim().min(1).max(120),
    limit: z.coerce.number().int().min(1).max(10).default(6),
});

export type CreateBlogInput = z.output<typeof createBlogSchema>;
export type SuggestBlogsQuery = z.output<typeof suggestBlogsQuery>;
export type UpdateBlogInput = z.output<typeof updateBlogSchema>;
export type ListBlogsQuery = z.output<typeof listBlogsQuery>;
