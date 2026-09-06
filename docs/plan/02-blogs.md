# Phase 2 — Blogs

**Size:** L · **Coupling:** ⚠️ **server + client must ship in the same commit**

**Goal:** authorship is proven, not claimed; the list is one query instead of `2N+2`; search actually
searches; the reading experience is real.

← [1 — Auth & Identity](01-auth-identity.md) · [Index](README.md) · Next: [3 — Comments](03-comments.md)

---

## What breaks

| Server change | Client that breaks |
|---|---|
| `POST /blogs` ignores body `author` | `blogs/create/page.tsx:77` |
| `PUT`/`DELETE /blogs/:id` now 401/403 | profile delete button, the new edit page |
| `getBlogsByUser` deleted → `GET /blogs?author=<id>` | `blogService.getByUser()` |
| list response gains `total`/`hasMore` | `blogStore` reads `currentPage`/`totalPages` — **keep both** |

## Dependencies

```bash
cd client && npm i react-markdown remark-gfm rehype-sanitize
```

---

## Server steps

### 1. `server/src/schemas/blog.schema.ts` (new)

```ts
export const createBlogSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(20_000),
  // NOTE: no `author` — it comes from req.user
});

export const updateBlogSchema = createBlogSchema.partial()
  .refine(o => Object.keys(o).length > 0, "Nothing to update");

export const listBlogsQuery = z.object({
  page:   z.coerce.number().int().min(1).max(10_000).default(1),
  limit:  z.coerce.number().int().min(1).max(50).default(9),      // hard ceiling
  q:      z.string().trim().min(1).max(120).optional(),
  author: z.string().regex(/^[0-9a-fA-F]{24}$/).or(z.literal("me")).optional(),
});
```

This closes two live bugs at
[blog.controller.ts:68-73](../../server/src/controllers/blog.controller.ts):

- `?limit=1000000` is honored verbatim today (a DoS primitive)
- `?page=-5` produces a **negative `skip`** → Mongo error → 500

### 2. The single most important line in the phase

- [ ] In `createBlog`, set `author: req.user.userId` — **never** `req.body.author` (line 28).
- [ ] Drop `author` from the guard at line 31 (`if (!title || !description || !author)`) — zod now
      validates title and description, and `author` is no longer a body field at all. Left in place
      it rejects every valid request.

### 3. Rewrite `server/src/routers/blogRouter.ts`

```ts
blogRouter.get("/",       optionalAuthenticate, validate({ query: listBlogsQuery }), getAllBlogs);
blogRouter.get("/:id",    optionalAuthenticate, validate({ params: objectIdParam }), getBlogById);
blogRouter.post("/",      authenticate, writeLimiter, uploadBlogImage,
                          validate({ body: createBlogSchema }), createBlog);
blogRouter.put("/:id",    authenticate, validate({ params: objectIdParam }),
                          requireOwnership(Blog, "author"),
                          uploadBlogImage, validate({ body: updateBlogSchema }), updateBlog);
blogRouter.delete("/:id", authenticate, validate({ params: objectIdParam }),
                          requireOwnership(Blog, "author"), deleteBlog);
```

> `uploadBlogImage` sits **after** `requireOwnership` — a stranger's PUT is rejected before multer
> buffers a single byte.

- [ ] The routers don't currently import models. `requireOwnership(Blog, "author")` needs
      `import Blog from "../models/blog.js"` at the top of `blogRouter.ts` — with the `.js`
      extension, per the ESM rule.

### 4. Kill the N+1 with one aggregation

`getAllBlogs` fires `2N+2` queries per page today: a `countDocuments` on Comment **and** on Like,
per blog, at lines 81-91. The same pattern is at lines 217-227 and `admin.controller.ts:98-104`.

```ts
const viewerId = req.user ? new Types.ObjectId(req.user.userId) : null;
const match: Record<string, unknown> = {};
if (q) match.$text = { $search: q };
if (authorId) match.author = new Types.ObjectId(authorId);

const [result] = await Blog.aggregate([
  { $match: match },
  ...(q ? [{ $addFields: { _score: { $meta: "textScore" } } }] : []),
  { $sort: q ? { _score: -1, createdAt: -1 } : { createdAt: -1 } },
  { $facet: {
      total: [{ $count: "n" }],
      rows: [
        { $skip: (page - 1) * limit }, { $limit: limit },
        { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "author",
                     pipeline: [{ $project: { username: 1, profilePicture: 1 } }] } },
        { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "comments", localField: "_id", foreignField: "blog", as: "c",
                     pipeline: [{ $count: "n" }] } },
        { $lookup: { from: "likes", localField: "_id", foreignField: "blog", as: "l",
                     pipeline: [{ $count: "n" }] } },
        ...(viewerId ? [{ $lookup: { from: "likes", let: { b: "$_id" }, as: "mine", pipeline: [
              { $match: { $expr: { $and: [{ $eq: ["$blog", "$$b"] }, { $eq: ["$user", viewerId] }] } } },
              { $limit: 1 }, { $project: { _id: 1 } } ] } }] : []),
        { $addFields: {
            commentsCount: { $ifNull: [{ $first: "$c.n" }, 0] },
            likesCount:    { $ifNull: [{ $first: "$l.n" }, 0] },
            likedByMe:     viewerId ? { $gt: [{ $size: "$mine" }, 0] } : false,
            excerpt:       { $substrCP: ["$description", 0, 200] } } },
        { $project: { c: 0, l: 0, mine: 0, _score: 0 } },
      ] } },
]);

const total = result?.total?.[0]?.n ?? 0;
res.json({
  blogs: result?.rows ?? [], page, limit, total,
  currentPage: page,                                  // keep for blogStore compatibility
  totalPages: Math.max(1, Math.ceil(total / limit)),
  hasMore: page * limit < total,
});
```

Notes:
- Collection names are mongoose's lowercase plurals: `users`, `comments`, `likes`
- `excerpt` stops the list shipping 20 KB bodies for every card. **But `$substrCP` on a markdown
  body yields raw syntax** — a card would read `## Building things **that** last`. Either strip it
  server-side in the pipeline, or (simpler and what step 15 assumes) strip it in `BlogCard` with a
  one-line regex: ``excerpt.replace(/[#*_`~>\[\]]/g, "")``. Do not run `react-markdown` in a card.
- `likedByMe` is emitted now; [Phase 4](04-likes.md) consumes it on the client

### 5. Text index for the `$text` stage

```ts
blogSchema.index({ title: "text", description: "text" },
                 { weights: { title: 10, description: 1 }, name: "blog_text" });
```

> **Caveat worth knowing:** `$text` matches whole words with stemming, so searching `"reac"` will not
> find `"React"`. If you want substring matching, use an **escaped** anchored regex on title only
> (`new RegExp(escapeRegex(q), "i")`) and accept the unindexed scan. Never interpolate raw user input
> into a RegExp.

### 6. Delete `getBlogsByUser` (lines 209-234)

- [ ] It's exported but **never routed**, and its client counterpart `blogService.getByUser` calls
      `/blogs/user/:userId`, which doesn't exist.
- [ ] Replace with `GET /api/blogs?author=<id>` on the same aggregation — one endpoint, pagination
      for free, and it's the actual fix for the [Phase 5](05-profile.md) profile bug.

### 7. Fix the image-loss bug in `updateBlog`

- [ ] Line 148 deletes the old image **before** `findByIdAndUpdate` runs, so a failed update loses
      the image irrecoverably while the record still points at it.
- [ ] Reorder: update first, delete the old image only after the write resolves. On failure, delete
      the *newly uploaded* file instead.

### 8. Transactional cascade in `deleteBlog`

- [ ] Wrap the `Comment.deleteMany` / `Like.deleteMany` / `Blog.findByIdAndDelete` trio in the same
      session/transaction pattern as `deleteMe`.

### 9. Cache headers

- [ ] On `GET /blogs` and `GET /blogs/:id` for **anonymous** requests:
      `Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=300`
- [ ] Skip it when `req.user` is set — the response contains `likedByMe`

---

## Client steps

### 10. `blogs/create/page.tsx`

- [ ] **Delete `submitData.append("author", user._id)` at line 77.** The server ignores it now, and
      leaving it makes the next reader think identity still comes from the body.
- [ ] Enforce the "max 10MB" the copy at line 170 promises but never checks
- [ ] Replace the `<div onClick>` dropzone at line 163 with a `<label>`-wrapped input
- [ ] Convert to RHF + zod using the shared schema
- [ ] **Add the markdown editor** — a split-pane textarea/preview using the same `react-markdown` +
      `remark-gfm` + `rehype-sanitize` pipeline as the reader, so what you see is what publishes

### 11. New route `app/(main)/blogs/[id]/edit/page.tsx`

- [ ] Doesn't exist today, which is why `blogService.update` and `blogStore.updateBlog` are both
      unreachable
- [ ] Mirror `requireOwnership` client-side: show a 403 state if
      `blog.author._id !== user._id && role !== "admin"`

### 12. Server-component split for `/blogs/[id]`

**The biggest Next.js win in the plan.** Today it's `"use client"` fetching in `useEffect`, so
crawlers and link previews get a spinner.

```
app/(main)/blogs/[id]/page.tsx          ← async server component + generateMetadata
app/(main)/blogs/[id]/loading.tsx       ← article skeleton
app/(main)/blogs/[id]/blog-actions.tsx  ← "use client": like / share / edit / delete
components/blog/CommentSection.tsx      ← stays "use client"
```

```ts
// client/lib/server-api.ts (new — plain fetch, no axios, no auth)
export const SERVER_API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export async function getBlog(id: string) {
  const res = await fetch(`${SERVER_API_URL}/blogs/${id}`, {
    next: { revalidate: 60, tags: [`blog:${id}`] },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getBlog ${id}: ${res.status}`);
  return (await res.json()).blog as Blog;
}
```

```tsx
// page.tsx — in Next 16 `params` is a Promise. Awaiting it is mandatory.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const blog = await getBlog(id);
  if (!blog) return { title: "Blog not found" };
  const description = blog.description.replace(/\s+/g, " ").slice(0, 155);
  return {
    title: blog.title, description,
    alternates: { canonical: `/blogs/${id}` },
    openGraph: { type: "article", title: blog.title, description, url: `/blogs/${id}`,
                 publishedTime: blog.createdAt, authors: [blog.author?.username],
                 images: blog.imageUrl ? [{ url: blog.imageUrl }] : undefined },
    twitter: { card: "summary_large_image", title: blog.title, description },
  };
}

export default async function BlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const blog = await getBlog(id);
  if (!blog) notFound();   // from next/navigation — the page currently renders its own 😢 with a 200
  // ...
}
```

### 13. `blogs/page.tsx` — server-render page 1, client-append the rest

Convert to an async server component reading `searchParams` (also a Promise in Next 16), fetching
page 1 and passing it to a `"use client"` `<BlogFeed initialData={...} query={q} />`.

This fixes three bugs at once:

- **Search** — the navbar pushes `?q=`, but line 63 filters only the pages already in memory, so
  searching for a post on page 5 shows "No blogs match". `q` now goes to the server.
- **Back-navigation** — `useEffect(() => fetchBlogs(1,5), [])` at line 28 refetches page 1 on every
  mount, discarding all appended pages and scroll position. Guard on
  `store.query === q && store.blogs.length > 0`.
- **The IntersectionObserver stall** — client filtering used to shrink the list below the fold so the
  sentinel never re-entered the viewport. With server-side search there's no filtering left.

### 14. `blogStore.ts`

- [ ] Add `query: string`, thread it through `fetchBlogs` / `fetchMoreBlogs`
- [ ] Add a `hydrate(initial)` action for the SSR handoff
- [ ] Replace the six `catch { set({ error: "Failed to ..." }) }` blocks with `getErrorMessage(err)`
      so real server messages surface
- [ ] `createBlog` / `updateBlog` / `deleteBlog` in the store are **unused** — pages call
      `blogService` directly, so the list goes stale after a create. Route the pages through the
      store *or* delete the store actions; don't leave both.

### 15. Redesign `BlogCard.tsx`

Today the title is `text-sm font-bold` and the excerpt `text-xs` — **the title is smaller than body
text.** The image band is an `h-44 bg-black` box containing the same `<img>` twice (a
`scale-110 blur-md opacity-50` fill behind an `object-contain` front).

- [ ] `next/image` with `fill` + `sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"`
      inside an `aspect-[16/9]` wrapper, `object-cover`. **This is the CLS fix** — 15 raw `<img>`
      with no dimensions is where the current layout shift comes from.
- [ ] Title `text-lg font-semibold line-clamp-2`, excerpt `text-sm text-fg-muted line-clamp-3`
- [ ] `<time dateTime={blog.createdAt}>` with `date-fns` `formatDistanceToNow`
- [ ] Reading time (`Math.ceil(words / 220)`)
- [ ] Grid gets a `sm:` step: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3` — today it jumps 1→2 at
      768px with nothing between

### 16. Blog detail typography + markdown

- [ ] Replace `<div className="text-gray-700 leading-relaxed whitespace-pre-wrap">` with
      `react-markdown` inside `prose prose-neutral dark:prose-invert max-w-none`
- [ ] **`rehype-sanitize` is not optional** — blog bodies are unsanitized user input
- [ ] **Move the image above the text.** It currently renders *after* the body at line 96, which is
      why the article reads oddly.
- [ ] Add author byline, reading time, share button

---

## Verification

```bash
curl -i -X POST localhost:5000/api/blogs -F title=x -F description=y -F author=SOMEONE_ELSES_ID  # 401
curl -s "localhost:5000/api/blogs?limit=999999" | jq '.blogs|length'                             # ≤ 50
curl -i "localhost:5000/api/blogs?page=-3"                                                       # 400, not 500
curl -s "localhost:5000/api/blogs?q=react" | jq '.total'
curl -i -X DELETE localhost:5000/api/blogs/$OTHERS_BLOG -H "Authorization: Bearer $TOKEN_B"      # 403
```

- [ ] **Query count** — set `mongoose.set("debug", true)` temporarily and load `/api/blogs?limit=9`.
      You should see **one** aggregate, not 20 queries.
- [ ] **SEO** — `curl -s localhost:3000/blogs/<id> | grep -o '<title>.*</title>'` returns the post
      title, and `grep 'og:title'` returns it too. View Source (not DevTools Elements) and confirm
      the article body is in the HTML.
- [ ] Search for a post you know is on page 5 → it's found
- [ ] Scroll to page 3, open a post, hit Back → all three pages and your scroll position survive
- [ ] Post a body with `## heading` and a link → both render on the detail page
- [ ] The same post's **card** shows clean prose, not `## heading`
- [ ] Post one containing `<script>alert(1)</script>` → it renders as inert text, and no alert fires


---

## Landed — deviations and findings

**The card grid became ruled rows.** Step 15 described a `sm:`/`xl:` card grid, but `DESIGN.md`
(written after this file) makes post lists ruled rows and demotes `Card` to a utility surface.
`BlogCard` is deleted; `components/blog/PostRow.tsx` replaces it, and `BlogCardSkeleton` became
`PostRowSkeleton` so the loading state matches what actually renders.

**`readingMinutes` is computed in the aggregation, not the component.** A list row does not carry
the body the estimate would be derived from, so `$split`/`$size` on `description` computes it before
the body is projected out.

**The excerpt is stripped server-side.** The plan suggested a regex in `BlogCard`; doing it in the
controller means every consumer gets clean prose and none of them repeat the rule. `lib/text.ts`
carries the client-side counterpart for the full body, used by `generateMetadata` — without it the
OG description read `## The case for patience`.

**The list and detail types were split.** `BlogListItem` (with `excerpt`, no body) versus `Blog`
(with `description`). This immediately caught a real breakage: `profile/page.tsx` was still
rendering list rows through a component that read `description`.

**Profile's author filter was fixed here, not deferred.** Changing the list shape broke it, and
`?author=me` — added for exactly this — is a one-line fix. It previously fetched the newest posts
site-wide and filtered client-side, so you only saw your own posts if they were among the most
recent on the whole site. [Phase 5](05-profile.md) still owns the profile redesign.

### Two bugs found by the verification, not by review

**`validate()` replaced `req.valid` instead of merging it.** The blog `PUT` calls `validate` twice —
params, then body after multer. The second call discarded the params, so `updateBlog` threw on
`req.valid.params` and every legitimate edit 500'd. Ownership still returned 403 correctly, which is
why it looked fine until an author tried to edit their own post. Fixed in
[validate.ts](../../server/src/middleware/validate.ts); it now merges.

**`getBlog` swallowed every failure into `null`.** A `null` meant both "no such post" and "the API
did not answer", so a sleeping API would have rendered a confident "Page not found" on every
article. `fetchJson` now throws `ApiUnreachableError` for transport and 5xx failures — the error
boundary renders instead — and reserves `null` for a real 404. The list still tolerates failure,
because `BlogFeed` retries from the browser.

### Verified

An isolated scratch database on the same cluster (seeded, asserted, then dropped — the developer's
own data was never touched):

- **One `blogs.aggregate` call per page**, asserted via `mongoose.set("debug", …)`. The `2N+2`
  round trips are gone.
- Authorship taken from the JWT; `403` on editing or deleting another author's post; `400` on a
  1-character title and on an empty update body.
- Pagination without overlap, `hasMore`, `$text` search hitting the right post and returning 0 for
  a non-word, `?author=<id>` and `?author=me`.
- Bounds: `?limit=999999` → 400, `?page=-3` → 400, `?author=notanid` → 400.
- `Cache-Control: s-maxage=60` for anonymous readers, `no-store` once signed in.
- **SEO end to end against a production build:** `<title>`, `og:title`, `og:description` (plain
  text, not markdown), `og:type=article` and `twitter:card` all in the HTML, and the article body
  server-rendered — `curl` sees the prose, not a spinner.
- **XSS:** a post containing `<script>alert(1)</script>` renders only as an escaped entity. Zero raw
  script tags in the response.

### Open

**A missing post answers 200, not 404** — a soft 404. The correct not-found page renders with the
correct title, but the status is wrong. Ruled out: crawler user-agent (`htmlLimitedBots`),
`loading.tsx` forcing a Suspense boundary, and `notFound()` inside `generateMetadata`. A bare
`notFound()` in a probe route *does* return 404, so the cause is specific to this route's async
data fetch committing the response early. Worth another look in [Phase 8](08-seo.md), which owns SEO.

**`comment.controller.ts:55` still passes the deprecated `new: true`** to `findOneAndUpdate`. The
two in the blog and user controllers were updated to `returnDocument: "after"`; that one belongs to
[Phase 3](03-comments.md).
