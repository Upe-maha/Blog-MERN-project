import { describe, expect, it } from "vitest";
import request from "supertest";
import { api, makeBlog, makeUser } from "./helpers.js";

const titles = (body: { suggestions: { title: string }[] }) => body.suggestions.map((s) => s.title);

describe("GET /api/blogs/suggest", () => {
    it("matches a partial word, which $text alone cannot", async () => {
        // The whole reason this endpoint exists rather than reusing ?q=. The text index stems whole
        // words, so "Think" never reaches "Thinking" through it.
        const author = await makeUser();
        await makeBlog(author, "Thinking in components");

        const res = await request(api).get("/api/blogs/suggest?q=Think").expect(200);
        expect(titles(res.body)).toContain("Thinking in components");
    });

    it("is case-insensitive, which the prefix index would not be on its own", async () => {
        const author = await makeUser();
        await makeBlog(author, "Margins and Marginalia");

        const res = await request(api).get("/api/blogs/suggest?q=margins").expect(200);
        expect(titles(res.body)).toContain("Margins and Marginalia");
    });

    it("still finds a whole word that is not a prefix of the title", async () => {
        // The $text half of the union: "cartography" is the last word, so no prefix match reaches it.
        const author = await makeUser();
        await makeBlog(author, "An essay about cartography");

        const res = await request(api).get("/api/blogs/suggest?q=cartography").expect(200);
        expect(titles(res.body)).toContain("An essay about cartography");
    });

    it("returns each post once even when both halves of the union match it", async () => {
        const author = await makeUser();
        await makeBlog(author, "Palimpsest");

        const res = await request(api).get("/api/blogs/suggest?q=Palimpsest").expect(200);
        expect(titles(res.body).filter((t) => t === "Palimpsest")).toHaveLength(1);
    });

    it("projects only _id and title", async () => {
        // A suggestion row must not start shipping bodies or author emails because somebody widened
        // a shared projection somewhere else.
        const author = await makeUser();
        await makeBlog(author, "Projection check");

        const res = await request(api).get("/api/blogs/suggest?q=Projection").expect(200);
        expect(Object.keys(res.body.suggestions[0]).sort()).toEqual(["_id", "title"]);
    });

    it("rejects a missing or empty term rather than scanning the collection", async () => {
        await request(api).get("/api/blogs/suggest").expect(400);
        await request(api).get("/api/blogs/suggest?q=").expect(400);
        await request(api).get("/api/blogs/suggest?q=%20%20").expect(400);
    });

    it("clamps the row count", async () => {
        await request(api).get("/api/blogs/suggest?q=a&limit=500").expect(400);
        const res = await request(api).get("/api/blogs/suggest?q=a").expect(200);
        expect(res.body.suggestions.length).toBeLessThanOrEqual(6);
    });

    it("treats a regex metacharacter as a literal", async () => {
        // An unescaped term reaching new RegExp is both a wrong-results bug and a ReDoS primitive.
        // ".*" must match a title containing ".*", not every title in the archive.
        const author = await makeUser();
        await makeBlog(author, "Ordinary title");

        const res = await request(api).get("/api/blogs/suggest?q=.%2A").expect(200);
        expect(titles(res.body)).not.toContain("Ordinary title");
    });

    it("keeps titleLower in step when a post is renamed", async () => {
        const author = await makeUser();
        const blog = await makeBlog(author, "Before the rename");

        await request(api)
            .put(`/api/blogs/${blog._id}`)
            .set(author.auth)
            .field("title", "Zephyr after the rename")
            .expect(200);

        const stale = await request(api).get("/api/blogs/suggest?q=Before%20the").expect(200);
        expect(titles(stale.body)).not.toContain("Before the rename");

        const fresh = await request(api).get("/api/blogs/suggest?q=Zephyr%20af").expect(200);
        expect(titles(fresh.body)).toContain("Zephyr after the rename");
    });

    it("is publicly readable and marked shareable-cacheable", async () => {
        const author = await makeUser();
        await makeBlog(author, "Cacheable");

        const res = await request(api).get("/api/blogs/suggest?q=Cacheable").expect(200);
        expect(res.headers["cache-control"]).toContain("s-maxage=60");
        expect(res.headers["cache-control"]).not.toContain("private");
    });
});
