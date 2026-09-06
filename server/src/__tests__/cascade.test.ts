import { describe, expect, it } from "vitest";
import request from "supertest";
import { api, makeBlog, makeComment, makeUser } from "./helpers.js";
import Blog from "../models/blog.js";
import Comment from "../models/comment.js";
import Like from "../models/like.js";
import User from "../models/user.js";

// These run inside a transaction, which is why globalSetup starts a replica set rather than the
// standalone mongodb-memory-server gives you by default.
describe("cascade deletes", () => {
    it("deleting a post removes its comments and likes", async () => {
        const owner = await makeUser();
        const reader = await makeUser();
        const blog = await makeBlog(owner);
        await makeComment(reader, blog._id);
        await request(api).post(`/api/likes/${blog._id}/toggle`).set(reader.auth).expect(200);

        expect(await Comment.countDocuments({ blog: blog._id })).toBe(1);
        expect(await Like.countDocuments({ blog: blog._id })).toBe(1);

        await request(api).delete(`/api/blogs/${blog._id}`).set(owner.auth).expect(200);

        expect(await Comment.countDocuments({ blog: blog._id })).toBe(0);
        expect(await Like.countDocuments({ blog: blog._id })).toBe(0);
    });

    it("deleting an account removes everything it authored", async () => {
        const owner = await makeUser();
        const other = await makeUser();
        const blog = await makeBlog(owner);
        await makeComment(other, blog._id);
        await request(api).post(`/api/likes/${blog._id}/toggle`).set(other.auth).expect(200);

        await request(api).delete("/api/users/me").set(owner.auth).expect(200);

        expect(await User.countDocuments({ _id: owner._id })).toBe(0);
        expect(await Blog.countDocuments({ author: owner._id })).toBe(0);
        // The comment and like belonged to `other` but sat on the deleted post — they go too,
        // rather than being orphaned rows pointing at nothing.
        expect(await Comment.countDocuments({ blog: blog._id })).toBe(0);
        expect(await Like.countDocuments({ blog: blog._id })).toBe(0);
    });

    it("an admin deleting a user cascades the same way", async () => {
        const admin = await makeUser({ role: "admin" });
        const victim = await makeUser();
        const blog = await makeBlog(victim);
        await makeComment(admin, blog._id);

        await request(api).delete(`/api/admin/users/${victim._id}`).set(admin.auth).expect(200);

        expect(await Blog.countDocuments({ author: victim._id })).toBe(0);
        expect(await Comment.countDocuments({ blog: blog._id })).toBe(0);
    });

    it("a deleted account's token stops working at once", async () => {
        const user = await makeUser();
        await request(api).delete("/api/users/me").set(user.auth).expect(200);
        await request(api).get("/api/users/me").set(user.auth).expect(401);
    });
});

describe("likes", () => {
    it("toggles on and off and reports the server's own count", async () => {
        const owner = await makeUser();
        const reader = await makeUser();
        const blog = await makeBlog(owner);

        let res = await request(api).post(`/api/likes/${blog._id}/toggle`).set(reader.auth).expect(200);
        expect(res.body).toEqual({ liked: true, likesCount: 1 });

        res = await request(api).post(`/api/likes/${blog._id}/toggle`).set(reader.auth).expect(200);
        expect(res.body).toEqual({ liked: false, likesCount: 0 });
    });

    it("never creates a duplicate under concurrent toggles", async () => {
        // The bug this replaced: findOne-then-create had a TOCTOU window, two clicks both inserted,
        // and the unique index surfaced E11000 as an unhandled 500.
        const owner = await makeUser();
        const reader = await makeUser();
        const blog = await makeBlog(owner);

        const responses = await Promise.all(
            Array.from({ length: 10 }, () =>
                request(api).post(`/api/likes/${blog._id}/toggle`).set(reader.auth)
            )
        );
        for (const r of responses) expect(r.status).toBeLessThan(500);
        expect(await Like.countDocuments({ blog: blog._id })).toBeLessThanOrEqual(1);
    });

    it("a like requires a token and cannot be aimed at a missing post", async () => {
        const owner = await makeUser();
        const blog = await makeBlog(owner);
        await request(api).post(`/api/likes/${blog._id}/toggle`).expect(401);
        await request(api)
            .post("/api/likes/000000000000000000000000/toggle")
            .set(owner.auth)
            .expect(404);
    });

    it("likedByMe is per-viewer and false for anonymous reads", async () => {
        const owner = await makeUser();
        const reader = await makeUser();
        const blog = await makeBlog(owner);
        await request(api).post(`/api/likes/${blog._id}/toggle`).set(reader.auth).expect(200);

        const mine = await request(api).get(`/api/blogs/${blog._id}`).set(reader.auth).expect(200);
        expect(mine.body.blog.likedByMe).toBe(true);

        const anon = await request(api).get(`/api/blogs/${blog._id}`).expect(200);
        expect(anon.body.blog.likedByMe).toBe(false);
        // Per-user state must never be cacheable by a shared cache.
        expect(mine.headers["cache-control"]).toMatch(/private|no-store/);
    });
});

describe("data exposure", () => {
    it("the public profile projects only safe fields", async () => {
        const user = await makeUser();
        const res = await request(api).get(`/api/users/${user._id}`).expect(200);
        expect(Object.keys(res.body.user).sort()).toEqual(
            ["_id", "createdAt", "profilePicture", "username"].sort()
        );
    });

    it("comment authors carry no email or role", async () => {
        const user = await makeUser();
        const blog = await makeBlog(user);
        await makeComment(user, blog._id);
        const res = await request(api).get(`/api/comments/blog/${blog._id}`).expect(200);
        const author = res.body.comments[0].user;
        expect(author).not.toHaveProperty("email");
        expect(author).not.toHaveProperty("role");
    });
});
