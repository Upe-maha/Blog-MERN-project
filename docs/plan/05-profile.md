# Phase 5 — Profile & account

**Size:** M · **Coupling:** ⚠️ **server + client must ship in the same commit**

**Goal:** the profile actually shows your posts, the edit form is accessible and leak-free, account
deletion is real.

← [4 — Likes](04-likes.md) · [Index](README.md) · Next: [6 — Admin](06-admin.md)

---

## Steps

### 1. Fix the profile blog list

`profile/page.tsx:29` calls `blogService.getAll()` with **no arguments**, so the server returns page
1 at limit 5 site-wide, and line 32 filters that by author on the client.

> A user only ever sees their own posts that happen to be among the 5 most recent posts **on the
> entire site**. The "Blogs" stat at line 96 is `userBlogs.length`, so it's wrong for the same reason.

- [ ] Replace with `GET /api/blogs?author=<id>&page=&limit=12` from [Phase 2](02-blogs.md)
- [ ] Give it its own infinite scroll or pagination

### 2. Real stats endpoint

- [ ] Add `GET /api/users/me/stats` returning `{ blogs, comments, likesReceived }` via a small
      `$facet` aggregation, so the header stats are real numbers rather than a filtered array's
      length.

### 3. Redesign the profile header

- [ ] `UserAvatar`, name, joined date via `<time dateTime>`, three stat tiles, actions
- [ ] Drop the `bg-white/50` translucency — a leftover from the deleted background photo
- [ ] Fix the "Joined" stat pill, which currently puts the *date* in bold colored text and the
      *label* in gray, reading backwards

### 4. Fix the unreachable delete button

`profile/page.tsx:159` is `opacity-0 group-hover:opacity-100` — **invisible on touch devices and
unreachable by keyboard** even though it's focusable.

- [ ] Move blog actions into a shadcn `DropdownMenu` (lucide `MoreVertical`) on each card: Edit /
      Delete, always present, keyboard-navigable
- [ ] Route delete through `ConfirmDialog`, not `confirm()` (line 44)

### 5. Rewrite `EditProfileForm.tsx`

- [ ] **Memory leak:** `URL.createObjectURL(file)` at line 24 is never revoked. Track the URL and
      call `URL.revokeObjectURL` in a cleanup effect *and* before creating the next one.
- [ ] Labels at lines 94 and 105 have **no `htmlFor`** and the inputs no `id` — not associated. Use
      shadcn `Form` / `FormLabel`, which wires this automatically.
- [ ] The `<div onClick>` avatar at line 58 → `<label>` + hidden input. Its "click to change"
      affordance is a `group-hover` overlay, so it's currently invisible to keyboard users too.
- [ ] RHF + zod with dirty-field tracking, so `PATCH` sends only what changed
- [ ] `authService.update(user._id, fd)` at line 42 → `authService.updateMe(fd)`
- [ ] Client-side size/type check before upload
- [ ] Replace the `setTimeout(() => router.push(...), 1200)` at line 45 with a toast + immediate
      navigation

### 6. Danger zone

- [ ] Delete account via `ConfirmDialog` with type-to-confirm, hitting `DELETE /api/users/me` — the
      cascading, transactional version from [Phase 1](01-auth-identity.md)
- [ ] Log out and redirect on success

### 7. Public profile page

- [ ] `app/(main)/users/[id]/page.tsx` (new, **server component**) — author name, avatar, their posts
- [ ] `BlogCard`'s author name becomes a link to it
- [ ] `generateMetadata` gives you another indexable page

---

## Verification

```bash
curl -s "localhost:5000/api/blogs?author=$USER_ID&limit=12" | jq '.total'   # the real count, not ≤5
curl -s localhost:5000/api/users/me/stats -H "Authorization: Bearer $T"
```

Browser:

- [ ] Create 8 posts, visit `/profile` → **all 8 appear and the stat says 8.** Before this phase
      you'd see only whichever of them were among the site's 5 newest.
- [ ] Keyboard-only: Tab to a blog card's action menu and delete a post without touching the mouse
- [ ] DevTools Memory: change the avatar preview five times → no growing blob URL list
- [ ] Delete a test account → its blogs, comments and likes are all gone
