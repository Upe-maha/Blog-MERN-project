import { describe, expect, it } from "vitest";
import request from "supertest";
import { api, makeBlog, makeComment, makeUser } from "./helpers.js";

// The 401/403/200 matrix. This is the class of bug the whole rebuild was about — every one of these
// routes previously took its identity from the request body, so anyone could act as anyone — and it
// is exactly what silently regresses when a router is refactored.
describe("ownership: blogs", () => {
    it("anonymous cannot edit a post", async () => {
        const owner = await makeUser();
        const blog = await makeBlog(owner);
        await request(api).put(`/api/blogs/${blog._id}`).send({ title: "hijacked" }).expect(401);
    });

    it("a different user cannot edit someone else's post", async () => {
        const owner = await makeUser();
        const stranger = await makeUser();
        const blog = await makeBlog(owner);
        await request(api)
            .put(`/api/blogs/${blog._id}`)
            .set(stranger.auth)
            .send({ title: "hijacked" })
            .expect(403);
    });

    it("the owner can edit their own post", async () => {
        const owner = await makeUser();
        const blog = await makeBlog(owner);
        const res = await request(api)
            .put(`/api/blogs/${blog._id}`)
            .set(owner.auth)
            .send({ title: "a legitimately edited title" })
            .expect(200);
        expect(res.body.blog.title).toBe("a legitimately edited title");
    });

    it("an admin can edit anyone's post", async () => {
        const owner = await makeUser();
        const admin = await makeUser({ role: "admin" });
        const blog = await makeBlog(owner);
        await request(api)
            .put(`/api/blogs/${blog._id}`)
            .set(admin.auth)
            .send({ title: "moderated" })
            .expect(200);
    });

    it("anonymous cannot delete a post", async () => {
        const owner = await makeUser();
        const blog = await makeBlog(owner);
        await request(api).delete(`/api/blogs/${blog._id}`).expect(401);
    });

    it("a stranger cannot delete a post, the owner can", async () => {
        const owner = await makeUser();
        const stranger = await makeUser();
        const blog = await makeBlog(owner);
        await request(api).delete(`/api/blogs/${blog._id}`).set(stranger.auth).expect(403);
        await request(api).delete(`/api/blogs/${blog._id}`).set(owner.auth).expect(200);
    });

    it("answers 404 before 403, so ids cannot be probed for existence", async () => {
        const stranger = await makeUser();
        // A well-formed id that does not exist. Returning 403 here would confirm which ids are real.
        await request(api)
            .delete("/api/blogs/000000000000000000000000")
            .set(stranger.auth)
            .expect(404);
    });
});

describe("ownership: comments", () => {
    it("anonymous cannot post a comment", async () => {
        const owner = await makeUser();
        const blog = await makeBlog(owner);
        await request(api).post(`/api/comments/blog/${blog._id}`).send({ content: "hi" }).expect(401);
    });

    it("the commenter is taken from the token, not the body", async () => {
        const owner = await makeUser();
        const impostor = await makeUser();
        const blog = await makeBlog(owner);
        const res = await request(api)
            .post(`/api/comments/blog/${blog._id}`)
            .set(impostor.auth)
            // Both of these used to be honoured. They must now be stripped by the schema.
            .send({ content: "whose comment is this", userId: owner._id, user: owner._id })
            .expect(201);
        expect(res.body.comment.user._id).toBe(impostor._id);
    });

    it("a stranger cannot edit a comment", async () => {
        const author = await makeUser();
        const stranger = await makeUser();
        const blog = await makeBlog(author);
        const comment = await makeComment(author, blog._id);
        await request(api)
            .patch(`/api/comments/${comment._id}`)
            .set(stranger.auth)
            .send({ content: "rewritten" })
            .expect(403);
    });

    it("an admin cannot edit a comment, but can delete it", async () => {
        const author = await makeUser();
        const admin = await makeUser({ role: "admin" });
        const blog = await makeBlog(author);
        const comment = await makeComment(author, blog._id);

        // Deliberate asymmetry: removing a comment is moderation, rewriting one puts words in
        // somebody else's mouth under their name.
        await request(api)
            .patch(`/api/comments/${comment._id}`)
            .set(admin.auth)
            .send({ content: "rewritten by an admin" })
            .expect(403);
        await request(api).delete(`/api/comments/${comment._id}`).set(admin.auth).expect(200);
    });

    it("the blog's author may delete a comment on their own post", async () => {
        const blogOwner = await makeUser();
        const commenter = await makeUser();
        const blog = await makeBlog(blogOwner);
        const comment = await makeComment(commenter, blog._id);
        await request(api).delete(`/api/comments/${comment._id}`).set(blogOwner.auth).expect(200);
    });

    it("an unrelated user may not delete a comment", async () => {
        const blogOwner = await makeUser();
        const commenter = await makeUser();
        const stranger = await makeUser();
        const blog = await makeBlog(blogOwner);
        const comment = await makeComment(commenter, blog._id);
        await request(api).delete(`/api/comments/${comment._id}`).set(stranger.auth).expect(403);
    });
});

describe("ownership: account", () => {
    it("PATCH /users/me requires a token and edits only the caller", async () => {
        const a = await makeUser();
        const b = await makeUser();

        await request(api).patch("/api/users/me").send({ username: "anon" }).expect(401);

        const res = await request(api)
            .patch("/api/users/me")
            .set(a.auth)
            // There is no :id form of this route, so there is nothing to aim at another account.
            .send({ username: "renamed_by_self" })
            .expect(200);
        expect(res.body.user._id).toBe(a._id);
        expect(res.body.user.username).toBe("renamed_by_self");

        // b is untouched.
        const other = await request(api).get("/api/users/me").set(b.auth).expect(200);
        expect(other.body.user.username).toBe(b.username);
    });
});
