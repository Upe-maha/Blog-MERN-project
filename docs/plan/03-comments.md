# Phase 3 — Comments

**Size:** M · **Coupling:** ⚠️ **server + client must ship in the same commit**

**Goal:** commenters are authenticated, only the author (or blog owner, or admin) can edit/delete,
and the UI stops using `alert()` and `confirm()`.

← [2 — Blogs](02-blogs.md) · [Index](README.md) · Next: [4 — Likes](04-likes.md)

---

## What breaks

| Server change | Client that breaks |
|---|---|
| `POST /comments` ignores `userId`, moves to `/comments/blog/:blogId` | `commentService.add()`, `commentStore.addComment()` |
| `PUT /comments/:id` → `PATCH` + ownership | nothing — no client ever called it |

**Dependencies:** none new.

---

## Server steps

### 1. Retype the whole controller

- [ ] All four handlers in `comment.controller.ts` are `(req: any, res: any)` — that's 4 of the 13
      `any`s that defeat `strict: true`. Use `asyncHandler` with real `Request` / `Response`.

### 2. `server/src/schemas/comment.schema.ts` (new)

```ts
export const addCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  // blogId moves to the URL; userId is deleted entirely
});

export const listQuery = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
```

### 3. Restructure the routes

Identity and target both come from the URL/token, and the missing pagination is added —
`getCommentsByBlog:40` has none today, so a popular post returns every comment ever written.

```ts
commentRouter.get("/blog/:blogId",
  validate({ params: blogIdParam, query: listQuery }), getCommentsByBlog);

commentRouter.post("/blog/:blogId",
  authenticate, writeLimiter,
  validate({ params: blogIdParam, body: addCommentSchema }), addComment);

commentRouter.patch("/:id",
  authenticate, validate({ params: objectIdParam, body: addCommentSchema }),
  requireOwnership(Comment, "user"), updateComment);

commentRouter.delete("/:id",
  authenticate, validate({ params: objectIdParam }),
  requireCommentDeletePermission, deleteComment);
```

> `updateComment` at line 86 currently does a bare `findByIdAndUpdate` with **no ownership check
> whatsoever** — any anonymous caller can rewrite any comment on the site.

### 4. `requireCommentDeletePermission`

- [ ] A small variant of `requireOwnership` allowing three principals: the comment's author, the
      blog's author (moderating your own post), or an admin.

### 5. Remove the counter increments

- [ ] Delete the `$inc: { commentsCount }` calls at lines 27 and 68. Phase 0A deleted those fields
      and Phase 2's aggregation computes the real number.

### 6. Return the populated comment

- [ ] Already done at line 29 — keep it, so the client can insert optimistically without a refetch.

---

## Client steps

### 7. `services/commentService.ts`

- [ ] `add(blogId, { content })` → `POST /comments/blog/:blogId`; drop `userId` from the signature
- [ ] `update` → `PATCH`

### 8. `stores/commentStore.ts`

- [ ] Key by blogId: `byBlog: Record<string, { items, page, hasMore, loading }>`
- [ ] Add `updateComment` — the API existed all along and no client ever called it
- [ ] Replace the four `catch {}` fixed strings with `getErrorMessage`

### 9. Rewrite `CommentSection.tsx`

- [ ] **`alert("Please login to comment")` at line 47 → sonner toast.** The form is already
      conditionally rendered for authenticated users at line 80, so this branch is nearly dead —
      replace it anyway for the token-expiry case.
- [ ] **`confirm(...)` at line 66 → `<ConfirmDialog>`** from 0B (focus trap, Escape, scroll lock)
- [ ] Add inline **edit** UI
- [ ] Optimistic add with rollback on failure
- [ ] Skeleton list instead of the `animate-spin` at line 134
- [ ] `<time dateTime>` instead of `toLocaleDateString()`
- [ ] "Load more comments" for the new pagination
- [ ] **Keep** the auto-grow textarea and Enter-to-submit — those are good. Just add an `aria-label`
      and a visible character counter near the 2000 cap.

---

## Verification

```bash
# unauthenticated write
curl -i -X POST localhost:5000/api/comments/blog/$BLOG \
  -H 'content-type: application/json' -d '{"content":"hi"}'                    # 401

# cross-user edit
curl -i -X PATCH localhost:5000/api/comments/$OTHERS_COMMENT \
  -H "Authorization: Bearer $TOKEN_B" \
  -H 'content-type: application/json' -d '{"content":"hacked"}'                # 403

# pagination now exists
curl -s "localhost:5000/api/comments/blog/$BLOG?limit=5" | jq '{n:(.comments|length), total, hasMore}'
```

Browser:

- [ ] Post a comment → appears instantly, no full refetch
- [ ] Edit it, delete it → Radix dialog: press Escape it closes, Tab keeps focus trapped
- [ ] Try to delete someone else's → the button isn't rendered; forge the request → 403 toast
- [ ] Confirm **no `window.alert` fires anywhere**
