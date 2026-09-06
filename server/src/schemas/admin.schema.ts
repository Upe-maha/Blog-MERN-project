import { z } from "zod";
import { paginationQuery } from "./common.schema.js";

const search = z.string().trim().min(1).max(120).optional();

// Both admin lists previously had no pagination at all and dumped the whole collection on every
// load. The sort key is an enum, never a raw field name: accepting one would let a caller sort by
// `password` and read the collection's order to infer hash prefixes.
export const adminUsersQuery = paginationQuery(20).extend({
    q: search,
    sort: z.enum(["newest", "oldest", "username", "email"]).default("newest"),
    role: z.enum(["user", "admin"]).optional(),
    blocked: z.enum(["true", "false"]).optional(),
});

export const adminBlogsQuery = paginationQuery(20).extend({
    q: search,
    sort: z.enum(["newest", "oldest", "title", "comments", "likes"]).default("newest"),
});

// "user" and "admin" only — the model's enum. There is no third role to fat-finger into existence.
export const setRoleSchema = z.object({ role: z.enum(["user", "admin"]) });

export type AdminUsersQuery = z.output<typeof adminUsersQuery>;
export type AdminBlogsQuery = z.output<typeof adminBlogsQuery>;
export type SetRoleInput = z.output<typeof setRoleSchema>;
