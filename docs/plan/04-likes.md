# Phase 4 — Likes

**Size:** M · **Coupling:** ⚠️ **server + client must ship in the same commit**

**Goal:** fix the always-empty heart, make liking a single atomic operation, kill the store
cross-contamination.

← [3 — Comments](03-comments.md) · [Index](README.md) · Next: [5 — Profile & account](05-profile.md)

---

## What breaks

| Server change | Client that breaks |
|---|---|
| `/likes` + `/likes/unlike` → `POST /likes/:blogId/toggle` | `likeService`, `likeStore`, `LikeButton`, `LikeSection` |
| `/likes/check/:blogId/:userId` → `GET /likes/me/:blogId` | `likeService.checkUserLike` |

**Dependencies:** none new.

---

## The two bugs this phase fixes

**Bug A — the always-empty heart.** `LikeButton.tsx` inits `useState(false)` at line 16 and never
calls `checkUserLike`. So on the blogs list and the profile grid, a post you already liked always
shows the empty 🤍, and clicking it sends a `like` the server rejects — which the `catch {}` at line
36 swallows silently.

**Bug B — store cross-contamination.** `stores/likeStore.ts` is a **singleton for one blog**
(`likesCount: number; isLiked: boolean`). Navigate from blog A to blog B and B briefly shows A's
count. It's also *why* `LikeButton` duplicates the whole thing in local `useState`.

---

## Server steps

### 1. Retype `like.controller.ts`

- [ ] The other 4 `(req: any, res: any)` handlers.

### 2. Replace `likeBlog` / `unlikeBlog` with one atomic toggle

Today `likeBlog` (lines 5-39) runs four sequential queries with a TOCTOU window between the
`findOne` at 19 and the `save` at 29. Two concurrent clicks race, the unique index at
[like.ts:19](../../server/src/models/like.ts) fires E11000, and it comes back as an unhandled 500.

```ts
// POST /api/likes/:blogId/toggle
export const toggleLike = asyncHandler(async (req, res) => {
  const { blogId } = req.params;
  const userId = req.user!.userId;

  if (!(await Blog.exists({ _id: blogId }))) throw notFound("Blog not found");

  const removed = await Like.findOneAndDelete({ blog: blogId, user: userId });
  if (!removed) {
    await Like.updateOne(
      { blog: blogId, user: userId },
      { $setOnInsert: { blog: blogId, user: userId } },
      { upsert: true },
    );
  }

  const likesCount = await Like.countDocuments({ blog: blogId });
  res.json({ liked: !removed, likesCount });   // authoritative count → no client drift
});
```

The upsert is atomic; a concurrent duplicate still surfaces as E11000, which Phase 0A's handler maps
to 409 instead of 500. **Returning `likesCount` from the server is what stops the counter drifting.**

### 3. Replace the like-check endpoint

- [ ] `GET /likes/check/:blogId/:userId` (line 83) takes the userId from **params**, so anyone can
      query anyone's like state. Replace with `GET /api/likes/me/:blogId` reading `req.user`.
- [ ] Honestly: once Phase 2's aggregation ships `likedByMe` on every list row and the detail
      response, this endpoint is only a fallback. Consider dropping it entirely.

### 4. Paginate or delete `getLikesByBlog`

- [ ] Line 68 has no pagination and populates every liker. Nothing in the client calls it — paginate
      it or remove the route.

### 5. Route table

```ts
likeRouter.post("/:blogId/toggle", authenticate, writeLimiter, validate({ params: blogIdParam }), toggleLike);
likeRouter.get("/me/:blogId",      authenticate, validate({ params: blogIdParam }), getMyLike);
likeRouter.get("/blog/:blogId",    validate({ params: blogIdParam, query: listQuery }), getLikesByBlog);
```

---

## Client steps

### 6. Rewrite `stores/likeStore.ts` as a keyed map

```ts
type Entry = { likesCount: number; liked: boolean; pending: boolean };

interface LikeState {
  byBlog: Record<string, Entry>;
  hydrate: (blogId: string, likesCount: number, liked: boolean) => void;
  hydrateMany: (blogs: Array<{ _id: string; likesCount: number; likedByMe: boolean }>) => void;
  toggle: (blogId: string) => Promise<void>;
}
```

- [ ] `toggle` flips optimistically, calls `POST /likes/:blogId/toggle`, then **overwrites with the
      server's authoritative `{liked, likesCount}`**, and rolls back with a toast on error.

### 7. Rewrite `LikeButton.tsx`

- [ ] The fix is **not** to add a `checkUserLike` call per card — that's an N+1 of HTTP requests.
- [ ] It's to consume `blog.likedByMe`, which Phase 2's aggregation already returns. `BlogCard` calls
      `hydrate(blog._id, blog.likesCount, blog.likedByMe)` on mount; the button reads
      `byBlog[blogId]`.

### 8. `LikeSection.tsx`

- [ ] `alert("Please login to like this blog")` at line 25 → toast + a link to `/login?next=`
- [ ] Use the same store, so the detail page and the card for the same post stay in sync

### 9. Accessibility

- [ ] Both controls are emoji-only (`🤍 {count}`), so a screen reader announces "white heart 3". Use
      lucide `Heart` with `fill-current` when liked, plus `aria-pressed={liked}` and
      `aria-label={liked ? "Unlike" : "Like"}`.

### 10. `types/index.tsx`

- [ ] Add `likedByMe: boolean` and `excerpt?: string` to `Blog`.

---

## Verification

```bash
curl -i -X POST localhost:5000/api/likes/$BLOG/toggle                                 # 401
curl -s -X POST localhost:5000/api/likes/$BLOG/toggle -H "Authorization: Bearer $T"   # {"liked":true,"likesCount":1}
curl -s -X POST localhost:5000/api/likes/$BLOG/toggle -H "Authorization: Bearer $T"   # {"liked":false,"likesCount":0}

# race: 10 concurrent toggles must never 500
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "%{http_code} " -X POST localhost:5000/api/likes/$BLOG/toggle \
    -H "Authorization: Bearer $T" &
done; wait
```

Browser:

- [ ] Like a post on `/blogs`, reload → **the heart is still filled** (this is Bug A, verify directly)
- [ ] Open the post's detail page → same state, same count
- [ ] Navigate blog A → blog B → B shows B's count, never A's (Bug B)
- [ ] Throttle to Slow 3G and double-click like → no double-count, no negative count
