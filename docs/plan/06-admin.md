# Phase 6 — Admin

**Size:** M · **Coupling:** mostly independent — `adminRouter` already had `authenticate, requireAdmin`

**Goal:** the dashboard scales past 50 rows, is keyboard-accessible, and works on a phone.

← [5 — Profile & account](05-profile.md) · [Index](README.md) · Next: [7 — Cloudinary](07-cloudinary.md)

---

## Server steps

### 1. Paginate and search both admin lists

- [ ] `getAllUsersAdmin` and `getAllBlogsAdmin` have **no pagination at all** today (the comment at
      line 91 says so explicitly), so both dump the whole collection. Add `?page&limit&q&sort`.

### 2. Reuse the Phase 2 aggregation

- [ ] Replace the per-blog `countDocuments` loop at `admin.controller.ts:98-104` with Phase 2's
      aggregation (add a `viewerId: null` call site).

### 3. Fix the sequential cascade in `deleteUserAdmin`

- [ ] The `for (const blog of userBlogs)` loop at lines 72-77 awaits **twice per blog**. Replace with
      three bulk `deleteMany` calls plus one image-cleanup batch, inside a transaction.

### 4. Guard the last admin

- [ ] Refuse to delete or block the final remaining admin
      (`User.countDocuments({ role: "admin" })`). Otherwise the dashboard becomes permanently
      unreachable.

### 5. Role management

- [ ] Add `POST /api/admin/users/:id/role` to promote/demote, now that self-service admin
      registration is gone.

### 6. Audit logging

- [ ] `logger.info({ actor, action, targetId }, "admin action")` on every mutation. Cheap, and it's
      the first thing anyone asks about in a review.

### 7. Dashboard stats

- [ ] Add `GET /api/admin/stats` — `{ users, blogs, comments, likes, blocked, newUsers7d }` in one
      `$facet`.

---

## Client steps

### 8. Stat cards row

- [ ] Top of the dashboard, from `/api/admin/stats`, lucide icons, shadcn `Card`.

### 9. Replace the hand-rolled tabs

- [ ] The tab buttons at line 76 are real `<button>`s (good) but lack `role="tablist"` / `role="tab"`
      / `aria-selected` / `aria-controls`. shadcn `Tabs` (Radix) gives you all of that plus arrow-key
      navigation for free.
- [ ] Sync the active tab into `?tab=` so it survives a refresh.

### 10. Replace the delete modal

- [ ] The modal at line 277 has **no `role="dialog"`, no `aria-modal`, no focus trap, no Escape
      handler and no background scroll lock.** Four bugs that one swap to shadcn `AlertDialog`
      eliminates.

### 11. Mobile card fallback

- [ ] Both tables are `overflow-x-auto` with no small-screen alternative — 5 columns of user data on
      a 375px screen means horizontal scrolling. Render `<table>` at `md:` and up, a stacked `Card`
      list below.

### 12. Table polish

- [ ] Debounced search input
- [ ] Sortable headers
- [ ] `Skeleton` rows instead of the two `animate-spin` divs (lines 100, 198)
- [ ] Pagination controls
- [ ] `EmptyState` replacing the bare `<p>No users found.</p>` at line 103 and `No blogs found.` at
      line 201 — much weaker than the emoji-illustrated empty states elsewhere in the app

### 13. `stores/adminStore.ts`

- [ ] Add pagination and query state
- [ ] Replace the five `catch {}` fixed strings with `getErrorMessage`
- [ ] `deleteUser` optimistically filters `blogs` by `b.author._id` (line 57) — correct, but silently
      wrong if `author` is unpopulated. Guard it.

### 14. Fix the tab count labels

- [ ] `blogs.length` / `users.length` at lines 87-88 now mean "rows on this page", not "total". Use
      the server's `total`.

---

## Verification

```bash
curl -i localhost:5000/api/admin/users                                        # 401 (no token)
curl -i localhost:5000/api/admin/users -H "Authorization: Bearer $USER_TOKEN" # 403 (non-admin)
curl -s "localhost:5000/api/admin/users?page=1&limit=10&q=jo" \
  -H "Authorization: Bearer $ADMIN" | jq '{n:(.users|length),total}'
curl -i -X DELETE localhost:5000/api/admin/users/$LAST_ADMIN_ID \
  -H "Authorization: Bearer $ADMIN"                                           # 400, guarded
```

Browser:

- [ ] Seed 60 users → pagination works
- [ ] Delete a user **keyboard-only**: Tab to the button, Enter, focus lands in the dialog, Escape
      cancels, Tab cycles inside
- [ ] Block yourself → refused
- [ ] 375px viewport → card list, no horizontal scroll
- [ ] Block a user in one tab while they're logged in in another → their next request 403s and the
      interceptor logs them out
