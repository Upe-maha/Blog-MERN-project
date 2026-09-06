# Blog-MERN → Production Ready

A phased plan to take this app from working-student-project to shippable. Each phase is a separate
file, independently completable and verifiable. Work them in order.

## Why

**It is not safe.** 22 of 27 API routes have no authentication. Identity is read from the request
body, not the token — [blog.controller.ts:28](../../server/src/controllers/blog.controller.ts#L28)
takes `author` from `req.body`, [comment.controller.ts:6](../../server/src/controllers/comment.controller.ts#L6)
takes `userId`, [like.controller.ts:6](../../server/src/controllers/like.controller.ts#L6) the same.
There is not one ownership check in the codebase: `updateBlog`, `deleteBlog`, `updateComment`,
`deleteComment`, `updateUser` and `deleteUser` all act for any caller. `POST /api/users` honours a
`role: "admin"` field from the body while no admin row exists, so the first request wins.
`GET /api/users` is unauthenticated and returns every user's email. `JWT_SECRET` silently falls back
to the literal `"your-secret-key"` in two places. No helmet, no rate limiting, no validation library,
no central error handler; multer errors surface as raw HTML 500s.

**It does not look finished.** A 262 KB background photo is pinned behind every page with
`background-attachment: fixed`, and three inconsistent surface treatments fight it (opaque white,
`white/50`, glassmorphism). A complete design system exists at `client/components/ui/` and **every
file in it is dead code** — `Button` 0 usages, `Input` 0, `Alert` 0 — so all 8 pages re-type the same
Tailwind strings and `indigo-600` appears ~50 times. Dark mode is half-declared: a
`prefers-color-scheme` block with zero `dark:` classes anywhere, which is a latent contrast bug
rather than a feature. All 8 pages are `"use client"`, so a crawler fetching a blog post receives a
spinner. `next/image` is used nowhere; 15 raw `<img>` tags have no dimensions.

**Outcome.** A blog whose authorization is enforced server-side and provably so, that looks like a
product in light and dark, renders content for crawlers and link previews, and is deployed to two
live URLs with images that survive a redeploy.

## Decisions taken

| | |
|---|---|
| **Sequencing** | Feature-sliced — each phase fixes the server *and* client of one feature together |
| **Design** | Clean modern. Background photo deleted, token palette, lucide icons, real dark mode, skeletons |
| **Hosting** | Vercel (client) + Render (server). Uploads move to Cloudinary — Render's disk is ephemeral |
| **Dependencies** | Free to add standard, well-maintained packages |
| **Admin bootstrap** | Seed script. `/users/check-admin` and the register-page admin checkbox are deleted — **later reversed, see below** |
| **Tests** | Narrow vitest + supertest suite over the 401/403/200 matrix only |
| **Blog bodies** | Markdown via react-markdown + remark-gfm + **rehype-sanitize** (mandatory) |

Three smaller defaults, stated as assumptions — change them if you disagree:

- **Auth transport stays Bearer-in-localStorage.** Middleware gets a non-sensitive, forgeable
  `bm_session` hint cookie purely to avoid a flash of protected content. Real enforcement is
  server-side, which is what Phase 1 builds. httpOnly cookies would need a Vercel same-origin
  rewrite — good later upgrade, not now.
- **Render over Railway.** Free, but spins down after 15 min idle (~50 s cold start) — note it in the
  README. Railway's hobby tier doesn't spin down but isn't free; config is otherwise identical.
- **Page-based pagination** everywhere; cursor-based for the feed is an optional Phase 9 upgrade.

> **Superseded — first-run admin claim.** Phase 1 deleted the register-page admin checkbox because
> the original honoured `role: "admin"` from the body with a check-then-create race: whoever hit the
> deployed app first won. The feature was reinstated afterwards, deliberately and differently. There
> is still no `role` key in the schema; `claimAdmin` only *asks*, and the grant is guarded by a
> unique sparse index on `bootstrapAdmin` so the race is impossible rather than unlikely. Verified
> with eight simultaneous claims. `npm run seed:admin` remains, and closes the window before it can
> be used. See `SECURITY.md`.

## Phases

| # | Phase | Size | Coupling |
|---|---|---|---|
| 0A | [Server foundation](00a-server-foundation.md) | L | none — no route contracts change |
| 0B | [Client foundation (design system)](00b-client-foundation.md) | L | none — old pages keep rendering |
| 0C | [Shell & home page](00c-shell-and-home.md) | M | client only |
| 1 | [Auth & Identity](01-auth-identity.md) | L | **server + client must ship together** |
| 2 | [Blogs](02-blogs.md) | L | **ship together** |
| 3 | [Comments](03-comments.md) | M | **ship together** |
| 4 | [Likes](04-likes.md) | M | **ship together** |
| 5 | [Profile & account](05-profile.md) | M | **ship together** |
| 6 | [Admin](06-admin.md) | M | mostly independent |
| 7 | [Cloudinary migration](07-cloudinary.md) | M | ship together |
| 8 | [SEO & server components](08-seo.md) | M | client only |
| 9 | [Performance & data integrity](09-performance.md) | S | server only |
| 10 | [Deployment](10-deployment.md) | M | both |
| 11 | [CI + tests](11-ci-tests.md) | M | both |

**Do not deploy before Phase 7.** Render's filesystem is ephemeral; every upload dies on redeploy.
*(Landed. The deploy gate is now the Cloudinary key: it needs `create`, not just read — see
server/.env.example.)*

**Suggested first session:** Phase 0A then 0B. Neither changes a route contract or a rendered page's
behavior, so you can land both, confirm nothing broke, and have every tool the six feature phases
need. Then 0C for the visible payoff — it is the only phase that touches the home page, navbar and
footer, which is what a visitor without an account actually sees. Phase 1 is the first one where
server and client must land in the same commit.

---

## Visual contract — read before any UI work

The design system is no longer "shadcn defaults plus indigo". The product is named **Marginalia**
and its visual world is **The Reading Room**, recorded in two files at the repo root:

- **[DESIGN.md](../../DESIGN.md)** — the normative visual contract. Tokens in the frontmatter, prose
  for how to apply them, and nine named rules (The One Voice Rule, The Flat Rule, The 68 Character
  Rule, …). **This supersedes every colour and typography reference in the phase files below**,
  including the indigo primary that 0B established.
- **[PRODUCT.md](../../PRODUCT.md)** — durable product truth. Most important for design: the primary
  reader is someone evaluating this in under two minutes, and **there are no users, testimonials or
  metrics, so copy must never imply any**.

Practically, for phases 2–6:

- Paper and ink, not white and grey. `--primary` is rust, not indigo.
- **Hairline rules, not cards.** Post lists are ruled rows. `Card` is a utility surface only — auth
  forms, admin tables, dialogs — and never appears on a reading surface.
- **No shadows anywhere.** The system has no shadow vocabulary.
- Fraunces reads, Geist operates. Prose is 18px serif on a 68ch measure.
- Run `/impeccable shape <surface>` before building a surface and `/impeccable audit` + `polish`
  after. Command reference: **[docs/ui/impeccable.md](../ui/impeccable.md)**.

The colours on the phase 2–6 surfaces were mechanically swapped to semantic tokens (so dark mode
works), but **their structure is untouched** — they are still the old card-and-box layouts. Designing
them is your phase's job, not a cleanup task.

---

## Rules that apply to every phase

**Server ESM — non-negotiable.** `"type": "module"` + `NodeNext` + `verbatimModuleSyntax` mean every
new file must suffix relative imports with `.js` (`import { env } from "./env.js"`) and use
`import type` for type-only imports. Get either wrong and it breaks at runtime or at build.

**Express 5 gotchas you will hit.**

1. `req.query` is a lazy getter — **you cannot assign to it.** Validation middleware must write to a
   new property (`req.valid`). This is also why you must **not** install `express-mongo-sanitize`: it
   mutates `req.query` and throws on Express 5. Zod parsing is the correct defense against operator
   injection.
2. Express 5 already forwards rejected promises to error middleware, so `asyncHandler` is a
   consistency tool, not a necessity. The central error handler is the real win.
3. With `multipart/form-data`, `req.body` is empty until multer has run — body validation must be
   registered **after** the upload middleware.

**Zod 4 is what installs.** `npm i zod` today gives **v4**, and the snippets in these files use the
v3 spelling for readability. Translate as you go:

| v3 (as written here) | v4 (what you type) |
|---|---|
| `z.string().email()` | `z.email()` |
| `z.string().url()` | `z.url()` |
| `z.coerce.boolean()` | **never use it** — see below |
| `err.errors` | `err.issues` (already used here) |

`z.coerce.boolean()` is a genuine trap: it is `Boolean(value)`, and `Boolean("false") === true`, so
an env var literally set to `false` parses as **true**. Anywhere you need a boolean from a string:

```ts
const boolFromEnv = z.enum(["true", "false"]).default("false").transform(v => v === "true");
```

**`{ message: string }` is a contract.** [client/lib/errorHandler.ts](../../client/lib/errorHandler.ts)
reads `error.response.data.message`. Every error response keeps it at the top level. Add `details`
alongside, never replace.

**Don't casually touch the auth storage contract.** [stores/authStore.ts](../../client/stores/authStore.ts)
persists under key `auth-storage` with `partialize` → `{user, token, isAuthenticated}`, and
[lib/api.ts:24](../../client/lib/api.ts#L24) reads that exact key and shape. Changing either breaks
every authenticated request with no error at the call site.

---

## Breaking-change coupling

Server and client edits land in the same commit. On deploy, server goes first.

| Phase | Server change | Breaks |
|---|---|---|
| 0A | `JWT_SECRET` required, min 32 chars | **Every existing token.** All users logged out once |
| 1 | `PUT /users/:id` → `PATCH /users/me` | `authService.update()`, `EditProfileForm.tsx:42` |
| 1 | `GET /users` deleted | `authService.getAll()` — currently unused, safe |
| 1 | `role` stripped from register | register admin checkbox + `/users/check-admin` *(the checkbox returned later as an atomic first-run claim; `role` is still stripped)* |
| 2 | `POST /blogs` ignores body `author` | `blogs/create/page.tsx:77` |
| 2 | list response gains `total`/`hasMore` | `blogStore` reads `currentPage`/`totalPages` — keep both |
| 3 | `POST /comments` ignores `userId` | `commentService.add()`, `commentStore.addComment()` |
| 4 | likes → `POST /likes/:blogId/toggle` | `likeService`, `likeStore`, `LikeButton`, `LikeSection` |
| 7 | image fields become absolute URLs | `getImageUrl` already passes absolutes through — but old `/uploads/...` rows 404 once the static mount is removed. **Migration script required** |

---

## Reuse, don't rewrite

These already exist and should be used rather than reinvented:

- `getErrorMessage` in [client/lib/errorHandler.ts](../../client/lib/errorHandler.ts) — exists, and is
  used at only 2 of ~20 catch sites
- `getImageUrl` in [client/lib/api.ts:9](../../client/lib/api.ts#L9) — already passes absolute URLs
  through unchanged, so Phase 7's Cloudinary switch needs no client change
- `hashPassword` / `comparePassword` in [server/src/utils/hashPassword.ts](../../server/src/utils/hashPassword.ts)
- The `isHydrated` flag in [client/stores/authStore.ts](../../client/stores/authStore.ts)
- The compound unique index at [server/src/models/like.ts:19](../../server/src/models/like.ts#L19) —
  it is what makes Phase 4's atomic toggle safe

---

## Progress

Tick a phase when its verification block passes end to end.

- [x] **0A** Server foundation
- [x] **0B** Client foundation
- [x] **0C** Shell & home page
- [x] **1** Auth & Identity
- [x] **2** Blogs
- [x] **3** Comments
- [x] **4** Likes
- [x] **5** Profile & account
- [x] **6** Admin
- [x] **7** Cloudinary migration
- [x] **8** SEO & server components
- [x] **9** Performance & data integrity
- [~] **10** Deployment — repo side done (render.yaml, README, SECURITY.md, verified locally in
      production mode); the actual Render/Vercel deploy needs account access
- [x] **11** CI + tests
