import { describe, expect, it } from "vitest";
import request from "supertest";
import { api, makeBlog, makeUser } from "./helpers.js";

describe("query bounds", () => {
    it("rejects an unbounded limit rather than honouring it", async () => {
        // ?limit=1000000 used to be honoured verbatim, which is a trivial DoS primitive.
        const res = await request(api).get("/api/blogs?limit=1000000").expect(400);
        expect(res.body.details?.[0]?.path).toBe("limit");
    });

    it("rejects a negative page", async () => {
        // A negative $skip is a 500 from the driver rather than the 400 it should be.
        await request(api).get("/api/blogs?page=-1").expect(400);
    });

    it("defaults sensibly when nothing is supplied", async () => {
        const res = await request(api).get("/api/blogs").expect(200);
        expect(res.body.limit).toBe(9);
        expect(res.body.page).toBe(1);
    });

    it("rejects a sort key that is not in the enum", async () => {
        // Accepting a raw field name would let a caller sort the user table by `password`.
        const admin = await makeUser({ role: "admin" });
        await request(api).get("/api/admin/users?sort=password").set(admin.auth).expect(400);
        await request(api).get("/api/admin/users?sort=username").set(admin.auth).expect(200);
    });
});

describe("id validation", () => {
    it("400s a malformed ObjectId instead of 500ing on a CastError", async () => {
        await request(api).get("/api/blogs/not-an-object-id").expect(400);
        await request(api).get("/api/comments/blog/not-an-object-id").expect(400);
        await request(api).get("/api/users/not-an-object-id").expect(400);
    });

    it("404s a well-formed id that does not exist", async () => {
        await request(api).get("/api/blogs/000000000000000000000000").expect(404);
        await request(api).get("/api/users/000000000000000000000000").expect(404);
    });
});

describe("operator injection", () => {
    it("rejects a query operator where a string is expected", async () => {
        // Zod parsing is the defence: express-mongo-sanitize cannot be used on Express 5, because
        // it mutates req.query, which is a getter-only lazy property there.
        const user = await makeUser();
        await request(api)
            .post("/api/users/login")
            .send({ email: { $ne: null }, password: { $ne: null } })
            .expect(400);
        expect(user.email).toBeTruthy();
    });
});

describe("body validation", () => {
    it("rejects a too-short title and a too-short body", async () => {
        const user = await makeUser();
        await request(api)
            .post("/api/blogs")
            .set(user.auth)
            .send({ title: "ab", description: "A body long enough to pass." })
            .expect(400);
        await request(api)
            .post("/api/blogs")
            .set(user.auth)
            .send({ title: "A fine title", description: "short" })
            .expect(400);
    });

    it("rejects an oversized title", async () => {
        const user = await makeUser();
        await request(api)
            .post("/api/blogs")
            .set(user.auth)
            .send({ title: "x".repeat(201), description: "A body long enough to pass the minimum." })
            .expect(400);
    });

    it("rejects an empty and an oversized comment", async () => {
        const user = await makeUser();
        const blog = await makeBlog(user);
        await request(api)
            .post(`/api/comments/blog/${blog._id}`)
            .set(user.auth)
            .send({ content: "   " })
            .expect(400);
        await request(api)
            .post(`/api/comments/blog/${blog._id}`)
            .set(user.auth)
            .send({ content: "x".repeat(2001) })
            .expect(400);
    });

    it("ignores an author supplied in the body", async () => {
        const user = await makeUser();
        const impostor = await makeUser();
        const res = await request(api)
            .post("/api/blogs")
            .set(user.auth)
            .send({
                title: "Whose post is this",
                description: "A body long enough to clear the minimum.",
                author: impostor._id,
            })
            .expect(201);
        expect(String(res.body.blog.author._id ?? res.body.blog.author)).toBe(user._id);
    });

    it("normalises an untrimmed, mixed-case email", async () => {
        const email = `  MiXeD${Date.now()}@Example.TEST  `;
        await request(api)
            .post("/api/users")
            .send({ username: "normalise", email, password: "password123" })
            .expect(201);
        // z.email() rejects an untrimmed address outright, so trim/lowercase must run first.
        await request(api)
            .post("/api/users/login")
            .send({ email: email.trim().toLowerCase(), password: "password123" })
            .expect(200);
    });
});

describe("error shape", () => {
    it("always carries a top-level message the client can read", async () => {
        // getErrorMessage on the client depends on this key existing.
        const res = await request(api).get("/api/blogs/not-an-object-id").expect(400);
        expect(typeof res.body.message).toBe("string");
        expect(res.body.message.length).toBeGreaterThan(0);
    });

    it("404s an unknown route as JSON, not an HTML error page", async () => {
        const res = await request(api).get("/api/no-such-route").expect(404);
        expect(res.headers["content-type"]).toMatch(/json/);
        expect(res.body.message).toBeTruthy();
    });
});
