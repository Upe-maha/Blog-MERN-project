# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

Two independent npm packages, no root `package.json` and no workspace config — install and run
each separately:

- `client/` — Next.js 16 (App Router), React 19, Tailwind v4, **Base UI** + shadcn `base-nova`,
  zustand, axios
- `server/` — Express 5, Mongoose 9, TypeScript ESM, Node `>=22 <25`

`README.md` predates the current architecture and is stale — trust this file and
[docs/plan/](docs/plan/README.md) over it.

## Commands

```bash
# client/
npm run dev      # Next dev server (port 3000)
npm run build
npm start
npm run lint     # eslint flat config (eslint.config.mjs, eslint-config-next)
npx tsc --noEmit # no typecheck script; tsconfig is already noEmit

# server/
npm run dev      # tsx watch src/index.ts
npm run build    # tsc -> dist/
npm start        # node dist/index.js
npm run typecheck   # tsc --noEmit
npm run seed:admin  # create/promote the admin account from ADMIN_EMAIL + ADMIN_PASSWORD
```

Both processes must be running for the app to work.

**Two suites.** `cd client && npm run test:e2e` is Playwright over a real browser at three
viewports (1440×900, 1024×768, 390×844) — it needs both processes up *and* the API's rate limits
raised, because a full run registers an account per test and blows past the production default of
300 requests per 15 minutes:

```bash
cd server && RATE_LIMIT_MAX=100000 RATE_LIMIT_WINDOW_MS=60000 npm run dev
```

Snapshots live in `e2e/*-snapshots/` and cover only pages whose content is stable — never the
archive or a post, whose content is whatever is in the database. `npm run test:e2e:update` refreshes
them; review the diff rather than accepting it blindly.

**The API suite is vitest + supertest** (`cd server && npm test`, or `test:watch`). They
run against an in-memory **replica set**, not a standalone — the cascade deletes use transactions,
which a standalone cannot do. `vitest.config.ts` supplies every variable `env.ts` requires, so no
`.env` is needed and CI needs no secrets.

Two things about that config are load-bearing:

- **A `resolveId` plugin rewrites relative `.js` imports to `.ts`.** `src/` is NodeNext ESM so every
  relative import carries `.js`; Node resolves that, Vite does not. Do **not** "fix" the source
  imports to satisfy Vitest — that breaks the production build.
- **Vitest's isolation boundary is the file, not the `describe`.** `express-rate-limit` keeps its
  counters in module scope, so a suite that trips a limiter poisons every later login *in the same
  file*. That is why `rateLimit.test.ts` and `rateLimitSuccess.test.ts` are separate files.

The suite is deliberately narrow — the 401/403/200 matrix, validation bounds, cascades and rate
limits — because that is the class of bug this codebase's history is made of. It is not a coverage
target. There are no client-side tests; `npm run lint` and `tsc --noEmit` are the client's gate.

## Environment

Every server variable is declared and validated in [server/src/env.ts](server/src/env.ts), and the
process **exits at startup** if any required one is missing or malformed — there are no silent
fallbacks left. Read `env.X`, never `process.env.X`. [server/.env.example](server/.env.example)
documents the full set; the ones with teeth:

- `MONGODB_URI`, `CLIENT_URL` (the primary CORS origin) — required, no default
- `JWT_SECRET` — required, minimum 32 characters
- `CORS_ORIGINS` — optional comma-separated extras; `ALLOW_VERCEL_PREVIEWS` opens
  `https://*.vercel.app`. `cors({ origin: undefined })` reflects *any* origin, so the allow-list in
  [app.ts](server/src/app.ts) is explicit and an unset value must never become "allow everything".
- `ENABLE_TRANSACTIONS` — the cascade delete in `services/user.service.ts` uses a transaction only
  when this is on, because transactions need a replica set (Atlas yes, a standalone local `mongod`
  no). Leave it off for local dev, on in production.
- `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` / `LOG_LEVEL` — defaulted, rarely touched
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_USERNAME` — read only by `npm run seed:admin`

Booleans come from a string enum, never `z.coerce.boolean()`: `Boolean("false") === true`, so
coercion would read an explicit `false` as true.

Client (all optional, all defaulted):

- `NEXT_PUBLIC_API_URL` (default `http://localhost:5000/api`) and `NEXT_PUBLIC_BASE_URL`
  (default `http://localhost:5000`) — read in [client/lib/api.ts](client/lib/api.ts)
- `API_URL` — server-side-only override in [client/lib/server-api.ts](client/lib/server-api.ts), so
  a deployment can point RSC fetches at an internal address while the browser uses the public one
- `NEXT_PUBLIC_SITE_URL` — `metadataBase` in [client/app/layout.tsx](client/app/layout.tsx);
  without it every OG/canonical URL resolves against `localhost:3000`

## Server architecture

Request path: [index.ts](server/src/index.ts) (env → `connectDB` → listen) →
[app.ts](server/src/app.ts) (trust proxy, helmet, pino-http, compression, CORS allow-list, JSON body
limits, global rate limit, `/uploads` static, mounts `/api/{users,blogs,comments,likes,admin}`,
`/api/health`) → `routers/*` → `controllers/*` → `models/*`.

`/api/health` reports `mongoose.connection.readyState`, not a static `"OK"` — a deploy must not go
green while Mongo is unreachable.

**ESM import rule.** `"type": "module"` + `moduleResolution: NodeNext` + `verbatimModuleSyntax`
mean every relative import must carry a `.js` extension even though the source is `.ts`
(`import User from "../models/user.js"`), and type-only imports must use
`import type { Request } from "express"`. Omitting either breaks the build or runtime.

**Auth.** `authenticate` verifies the Bearer JWT and then re-reads `isBlocked`/`role` from Mongo on
every request — a block applied after issuance takes effect immediately, and `role` in the token is
never trusted. It reads `passwordChangedAt` in the same query, because **a password change
retires every token issued before it**: each JWT carries a `pwd` claim holding the generation it was
minted against, and `authenticate` 401s any token whose claim no longer matches the row. That is an
equality test, not `iat < changedAt` — `iat` is whole seconds, so a comparison would also retire the
replacement token minted in the same second as the change. Tokens predating the claim read as
`0 === 0` and stay valid, so shipping it signs nobody out.

Which makes `PATCH /users/me/password` the one route that hands back a new token mid-session: it has
just invalidated its own caller's. **The client must store what it returns** (`ChangePassword` calls
`setUser`) or the user signs themselves out by changing their password — a break no API test can
see, which is what `auth.spec.ts` covers it for. A wrong *current* password answers 400, not 401,
for the same reason the login form does. `optionalAuthenticate` is the same but lets anonymous callers through, for public
routes that personalise their response (the blog list's `likedByMe`). `requireAdmin` chains after
`authenticate`; `requireOwnership(Model, "ownerField")`
([ownership.middleware.ts](server/src/middleware/ownership.middleware.ts)) is the reusable "only your
own row" link — it answers 404 before 403 so ids cannot be probed.

**Identity comes from the token, never the body — everywhere, now.** `/users/me` reads
`req.user.userId`, `POST /blogs` takes `author` from the JWT, `POST /comments/blog/:blogId` and
`POST /likes/:blogId/toggle` take the actor from it, and writes go through `requireOwnership`. No
route reads an identity out of a request body or a URL segment any more; never reintroduce one.

Not every permission is one owner field. `requireCommentDeletePermission` in the same file admits
three principals — the commenter, the blog's author moderating their own post, and an admin — while
comment *editing* deliberately passes `allowAdmin: false`, because rewriting text that stays
published under someone else's name is not the same power as removing it.

[blogRouter.ts](server/src/routers/blogRouter.ts) is the canonical chain to copy — note the `PUT`
ordering: `authenticate` → validate `:id` → `requireOwnership` → multer → validate body. Ownership is
proven **before** multer buffers a byte, so a stranger's request cannot be used to write files to
disk; body validation still has to follow multer.

**`validate()` merges into `req.valid`, it does not replace it.** That same `PUT` calls it twice. An
assignment on the second call silently drops the params the controller then reads — a runtime 500,
not a compile error.

**Validation.** Zod schemas live in `server/src/schemas/`, are applied by
`validate({ body, params, query })` in the router, and land on `req.valid` — **never** back on
`req.query`, which is a getter-only lazy property in Express 5. (This is also why
`express-mongo-sanitize` cannot be installed: it mutates `req.query`. Zod parsing is the defense
against operator injection — a schema expecting a string rejects `{ $ne: null }`.) Controllers read
`req.valid.body as XInput`. With `multipart/form-data`, `validate` must come *after* multer, because
`req.body` is empty until multer has parsed it.

**`likedByMe` is only true for a request that carried a token.** The blog list and detail
responses compute it from `req.user` via `optionalAuthenticate`, and `setListCache` marks those
responses `private, no-store`. The client's pages are fetched by *server components with no token*
and cached for every viewer, so the `likedByMe` they receive is **always false** — a signed-in
reader's real state comes from `GET /likes/me/:blogId`, which is why that route exists rather than
being the redundant fallback it looks like.

**Liking is one atomic toggle.** `POST /likes/:blogId/toggle` does `findOneAndDelete`, else an
upsert — each a single atomic document operation, so two concurrent clicks cannot both insert
against the unique `{blog, user}` index. It returns the authoritative `{ liked, likesCount }`;
a client that increments its own counter instead drifts as soon as anyone else likes the post.

**The feed pages by cursor; everything else pages by number.** `GET /api/blogs?after=<ISO date>`
seeks straight into the `createdAt` index and returns `nextCursor`, with **no `total`** — computing
one forces every matching document through the cursor just to be counted. Measured on 500 posts:
page 50 examines **500 documents to return 9**, the equivalent cursor examines **10**, and the gap
grows linearly with the archive. `skip` also shifts by one whenever somebody publishes mid-scroll,
which duplicates or drops a row. `?page=` stays for the admin tables and the profile, where jumping
to a numbered page is the point, and a text search always uses it — relevance ordering has no date
to seek on.

**Indexes are built deliberately in production.** `autoIndex` is off there (building an index on
boot is an unbounded write against a live collection, and every replica does it at once during a
rolling deploy), so schema index changes need `npm run indexes` after deploying. That runs
`syncIndexes()`, which also **drops** indexes no longer in the schema.

**Never `select("-password")`.** Excluding one field still ships every field added later. Both
`ADMIN_USER_FIELDS` and `PRIVATE_USER_FIELDS` are allow-lists, so a new column has to be opted into.

**The blog list is one aggregation.** `getAllBlogs` returns author, comment/like counts, `likedByMe`,
`readingMinutes` and a markdown-stripped `excerpt` in a single `$facet` pipeline — never a
`countDocuments` per row. A list row deliberately omits `description`; the types split into
`BlogListItem` and `Blog` so a component cannot read a body that was never sent.

**A `role` in the request body is still ignored.** `registerSchema` has no `role` key and
`z.object` strips unknown ones, so a body carrying `role: "admin"` silently creates a normal user.

**The first admin can be claimed at signup, once.** `GET /users/bootstrap-status` answers a single
boolean, and the register form offers the option only while it is false. `claimAdmin` is a *request*
— the server grants it solely when no admin exists. The guarantee is a **unique sparse index on
`bootstrapAdmin`**, not the role pre-check: a count-then-create has a window where eight concurrent
signups all see "no admin yet", and the index is what makes exactly one of them win (the losers are
still registered as ordinary users). An admin created by `npm run seed:admin` leaves `bootstrapAdmin`
unset and so is invisible to that index — the role pre-check is what covers that case. Both paths are
tested in `bootstrap.test.ts`, including the eight-way race.

`npm run seed:admin` still works and is the right tool for a deployment you do not want to leave
claimable. After the first admin, `POST /api/admin/users/:id/role` promotes and demotes.

**One admin must always survive.** Every admin route refuses to act on the caller's own account, so
any admin they *can* target implies a second admin exists — meaning no admin route can cause a
lockout, and a check for one there would be unreachable code. The path that can is `DELETE
/users/me`, which has no role check of its own; `isLastAdmin()` in
[services/user.service.ts](server/src/services/user.service.ts) guards it there. Verified: the last
admin genuinely could delete themselves and leave `/admin` permanently unreachable.

**The admin lists share the blog aggregation.** `enrichStages` lives in
[services/blog.query.ts](server/src/services/blog.query.ts), not in a controller, because the admin
table needs it too — it previously ran two `countDocuments` *per row* over the whole collection. Pass
`ADMIN_AUTHOR_FIELDS` for the wider author projection (email, role); the default is the narrow public
one, so widening it for admin can never widen the public list. Admin search goes through
`escapeRegex` — an unescaped user string reaching `new RegExp` is both a wrong-results bug and a
ReDoS primitive. Sort keys are enums, never raw field names.

**Rate limits.** [rateLimit.ts](server/src/middleware/rateLimit.ts) exports `globalLimiter`,
`loginLimiter`, `registerLimiter` and `writeLimiter`. `express-rate-limit` gives each `rateLimit()`
call its own store, so mounting one instance on two routes puts them in a shared bucket —
`loginLimiter` and `registerLimiter` are separate instances on purpose.

**Uploads go to Cloudinary; nothing touches the filesystem.** multer uses `memoryStorage`, there
is no `/uploads` static mount, and `uploads/` should stay empty forever — Render and Railway wipe the
disk on every redeploy, which is what made a disk-backed upload a broken image waiting to happen.

Controllers never build image URLs. They call `persistUpload(file, "blogs" | "profiles")` /
`removeStored({ url, publicId })` in [config/imageStorage.ts](server/src/config/imageStorage.ts) —
the seam that made the Cloudinary switch a one-file change. The destination folder is now an explicit
argument rather than being inferred from the multer field name, so renaming a field can no longer
file an image in the wrong place.

**Deletion is by `publicId`, never by URL.** A Cloudinary URL carries transformation and version
segments and cannot be reversed into an id, so every image field has an id field beside it
(`imagePublicId`, `profilePicturePublicId`). The URL field names were kept, so no client type
changed — they simply hold absolute `https://res.cloudinary.com/...` URLs now, which `getImageUrl`
already passes through.

**A Cloudinary key that reads is not necessarily a key that writes.** A scoped read-only key makes
`api.ping()` return `{"status":"ok"}` and then 403s every upload, so the app looks healthy until
someone attaches a cover image. `npm run check:cloudinary` settles it in one command. Upload failures
are translated in `imageStorage.ts` — 401/403 becomes a 503 with a usable message plus a server log
naming the real cause, rather than the opaque 500 they used to produce.

**`file.mimetype` is the client's claim, not a fact.** multer's `fileFilter` is a cheap first pass;
the real check is `fileTypeFromBuffer` in `persistUpload`, which reads the magic bytes and runs
*before* anything is sent to Cloudinary. A text file renamed `.jpg` and posted as `image/jpeg` gets a
400. Both limits are 5 MB, matching `MAX_COVER_BYTES` / `MAX_AVATAR_BYTES` in
[client/lib/validation/](client/lib/validation/) — change one and change the other.

`keepUpload` / `discardUpload` survive as no-ops: with `memoryStorage` a rejected request leaves
nothing to clean up.

**Responses.** Every error goes through [error.middleware.ts](server/src/middleware/error.middleware.ts),
which renders `AppError`, `ZodError`, `MulterError` and Mongoose errors as `{ message }` (+ optional
`details`). Throw `badRequest()` / `unauthorized()` / `forbidden()` / `notFound()` / `conflict()`
from [utils/AppError.ts](server/src/utils/AppError.ts) rather than writing a status by hand. The
top-level `message` key is a contract the client's error helper depends on.

**Failed logins answer 400, not 401.** The client treats *every* 401 as an expired session and
force-logs-out; a 401 from the login form would fire that on a visitor who was never signed in.

## Client architecture

**Rendering split.** Pages under `app/` are React Server Components by default and fetch through
[lib/server-api.ts](client/lib/server-api.ts) — plain `fetch`, deliberately not the axios client,
because there is no localStorage on the server and an anonymous request is what makes the response
cacheable (`next: { revalidate: 60, tags }`). Interactive slices are extracted into sibling
`"use client"` files (`blogs/blog-feed.tsx`, `blogs/[id]/blog-actions.tsx`,
`blogs/[id]/edit/edit-guard.tsx`) rather than making the whole route a client component.

`server-api` distinguishes two failures on purpose: `getBlog` **throws** `ApiUnreachableError` so
`error.tsx` renders, while a genuine 404 returns `null` for `notFound()`. Collapsing them would show
"Post not found" every time the API was asleep. `getBlogs` swallows the error and returns `null`
instead, because `BlogFeed` retries from the browser.

Client-side data flow is `component → zustand store or service → apiClient`. Components should not
call axios directly — add a method to the relevant service in [client/services/](client/services/)
instead. There is no `hooks/` directory: both hooks in it were passthroughs with no consumers.

**Auth wiring is coupled through localStorage.** [stores/authStore.ts](client/stores/authStore.ts)
persists `{ user, token, isAuthenticated }` under the key `auth-storage`, and the axios request
interceptor in [lib/api.ts](client/lib/api.ts) reads that key directly to set the `Authorization`
header. Changing the persist key or the `partialize` shape breaks every authenticated request with
no error at the call site. `isHydrated` (set by `onRehydrateStorage`) exists to avoid rendering
against an empty store before rehydration; [RequireAuth](client/components/auth/require-auth.tsx)
waits for it and then redirects unauthenticated users to `/login?next=`.

**The 401 handler is an event, not an import.** `store → service → lib/api → store` is a circular
import the bundler resolves to `undefined` at runtime, so the axios response interceptor dispatches
`auth:unauthorized` / `auth:blocked` `CustomEvent`s on `window`, and `AuthEventBridge` in
[app/providers.tsx](client/app/providers.tsx) listens, logs out, toasts and redirects. Never import
the auth store into `lib/api.ts` to "simplify" this.

**The session-hint cookie is written by the store, not by call sites.** `setUser` / `logout` in
authStore call `setSessionHint` / `clearSessionHint` ([lib/sessionHint.ts](client/lib/sessionHint.ts)),
so no logout button can forget to. [client/proxy.ts](client/proxy.ts) — Next 16's rename of the
`middleware` convention — reads `bm_session` (and `bm_role` for `/admin`) to redirect away from
`/profile`, `/blogs/create` and `/admin` before render. **It is not authorisation:** both cookies are
non-sensitive and trivially forgeable, and they exist only to avoid a flash of protected content.
Real enforcement is the API's.

**A tagged fetch is only half the design — something must invalidate it.** `lib/server-api.ts`
caches every server-component fetch for 60s under a tag (`blogs`, `blog:<id>`, `user:<id>`), and
[app/actions.ts](client/app/actions.ts) is what drops those tags after a mutation. `router.refresh()`
alone does **not** work: it re-runs the server components, which read the same cached response and
render the same stale list — which is why a newly published post used to need a manual reload.

Use `updateTag`, not `revalidateTag`: it is the Next 16 API for read-your-own-writes from a server
action, and the person who just published has to see their post immediately.

Likes and comments count too. Neither changes a post's text, but both change numbers rendered into
the cached archive row and the cached article, so both invalidate `blog:<id>` and `blogs`. Editing a
comment does not — the count is unchanged. Every one of these calls is awaited. Engagement calls
used to be `void`ed on the theory that the optimistic button must not wait on them, but the
optimistic patch and the API round trip have both already happened by that line, so awaiting delays
nothing a reader can see — and an unobserved promise swallows its own failure.

**Invalidating the tag is still only half of it, because the feed has a store in front of it.**
`BlogFeed` renders from `stores/blogStore` once that store holds rows for the current query, and the
store is *not* persisted. It used to skip re-seeding whenever it already had rows — so a correctly
revalidated payload arrived and was discarded, and a full reload (the one thing that clears an
in-memory store) was the only way to see your own comment, like, or new post. It now compares what
the server sent against what it holds: same rows with different numbers are patched in place via
`reconcile()` so a deep scroll survives, a changed set of rows re-seeds via `hydrate()`.

Note this is invisible to any test built on `page.goto`, which reloads the app and so gets a fresh
store every time. `e2e/freshness.spec.ts` navigates by clicking links for exactly that reason, and
was confirmed to fail against the old guard before being kept.

**Pagination lives in the store.** [stores/blogStore.ts](client/stores/blogStore.ts) owns
`currentPage` / `totalPages` / `hasMore` / `isFetchingMore`; `fetchBlogs` resets the list,
`fetchMoreBlogs` appends for infinite scroll.

**Loading UI is a route `loading.tsx` delegating to [components/skeletons](client/components/skeletons/index.tsx)** —
never a hand-rolled centred spinner, which collapses the layout and then reflows.

**Markdown.** Blog bodies render through [components/blog/Markdown.tsx](client/components/blog/Markdown.tsx)
— one component so the reader and the create-page preview cannot diverge. `rehype-sanitize` is
**mandatory**, not optional: bodies are unsanitized user input. `lib/text.ts` (`toPlainText`,
`truncate`) is what feeds meta descriptions, so a link preview never reads `## Some heading`.

**Images.** Server returns relative paths; use `getImageUrl` from [lib/api.ts](client/lib/api.ts)
to prefix `BASE_URL` (it passes absolute URLs through unchanged).

**Errors.** Surface API failures through `getErrorMessage` in
[lib/errorHandler.ts](client/lib/errorHandler.ts), which unwraps `AxiosError` → `response.data.message`.

### UI conventions

**Base UI, not Radix.** `client/components/ui/` is shadcn's `base-nova` style over
`@base-ui/react`. Polymorphism is the `render` prop — `<Button render={<Link href="/x" />}>` — and
**`asChild` does not exist**. There is also **no `<Form>` component**: forms are `Field` +
react-hook-form + `zodResolver`, with schemas in [client/lib/validation/](client/lib/validation/)
kept literally identical to the server's so a client-side error matches what the server would have
said. Client validation is feedback only.

**Theming** is `next-themes` with `attribute="class"`, paired with `@custom-variant dark (&:is(.dark *))`
in globals.css — so dark styling is the `.dark` class, and `<html>` carries `suppressHydrationWarning`.
Toasts are `sonner`, mounted once in `providers.tsx`.

**Design system — read [DESIGN.md](DESIGN.md) before touching UI.** It is an implementation
contract, not a moodboard: §31 radius, §14/§16 control geometry, §37 contrast minimums, §42 the
state model every component must define, §48 layering, §54 when an exception is allowed, and §57 a
pre-ship checklist whose last section is machine-verifiable. The YAML frontmatter is the normative
token copy the tooling reads — keep it in step with §59.

Tokens are declared once in [globals.css](client/app/globals.css) and nowhere else:
`--surface-hover` is the single "this is being pointed at" tone — before it there were six
different treatments (`muted`, `muted/50`, `muted/60`, `secondary/80`, `input/50`), all of
them too faint to notice. Hover changes colour only: DESIGN.md §44 forbids moving, scaling or
resizing, so tone is the whole vocabulary. Never dim text on hover — that reads as disabled.
 colours, the
`--z-*` layering scale (no component hard-codes a z-index), `--primary-hover` (a real hover colour,
not an opacity fade), motion durations, and `--container-page`. Controls are 40px, small 32px, large
44px — that is §14 and also what satisfies the touch-target audit.
 The product is **Marginalia**;
its visual world is **The Reading Room**: warm paper and ink, a rust accent used on ≤10% of a screen,
**hairline rules instead of cards**, and **no shadows anywhere**. Fraunces (serif) is for anything
read; Geist (sans) for anything operated. Tokens live in
[client/app/globals.css](client/app/globals.css) — Tailwind v4 is CSS-first, there is no
`tailwind.config.*`. Never write a raw colour (`indigo-600`, `gray-700`); all 230 such occurrences
were removed. `Container` is applied once in `app/(main)/layout.tsx` and owns page width — a page
that adds its own `max-w-*` double-pads on mobile. Inside it, use `max-w-reading` (42rem) for prose
and `max-w-feed` (48rem) for lists.

[PRODUCT.md](PRODUCT.md) carries product truth. The load-bearing constraint: **there are no users,
testimonials or metrics, and copy must never imply any.**

The `/impeccable` skill enforces both, and a detector hook runs on every `Edit`/`Write` to a UI file
(shell edits via `sed` bypass it — run `npx impeccable detect` by hand after those). Commands and
conventions: [docs/ui/impeccable.md](docs/ui/impeccable.md).

**Routing.** Route groups `(auth)` (login, register — its own shell, no navbar) and `(main)` (home,
blogs, profile, admin, public author pages at `/users/[id]`) under [client/app/](client/app/). The
`@/*` path alias maps to the `client/` root.

**`alternates.canonical` is inherited too — never set one on the root layout.** A canonical on
`app/layout.tsx` is inherited by every page that does not set its own, so `/blogs`, `/login` and the
rest all declared themselves duplicates of the homepage. Each indexable route sets its own; `/blogs?q=`
points at `/blogs`.

**A client component reading a store renders empty on the server.** `BlogFeed` took its rows from
zustand, whose `hydrate` runs in an effect — and effects do not run during SSR — so `/blogs` shipped
the "Nothing published yet" empty state to every crawler and cold visitor, with the posts appearing
only after hydration. It now renders from the `initial` prop until the store has genuinely taken over.
Check any new SSR-fed client component the same way: strip `<script>` tags from the HTML and confirm
the content is still there.

**Metadata: declaring `openGraph` replaces the parent's, it does not merge into it.** A page that
sets an `openGraph` block without an `images` key therefore ends up with **no `og:image` at all** —
including the file-convention one from a sibling `opengraph-image.tsx`. This silently cost the post
page its share card. Either omit `openGraph` entirely and inherit, or name an image explicitly.

**Fonts are on the LCP path.** Only axes that are actually varied belong in `next/font`'s `axes`
(Fraunces uses `WONK` and `opsz`; `SOFT` was requested and never set off its default), and a family
nothing renders in should not be loaded at all — dropping unused axes and Geist Mono took the font
payload from ~398 KB to 232 KB and LCP from 4.2 s to 3.7 s. Feed rows use `prefetch={false}`: a list
of N rows otherwise fires 2N RSC prefetches on paint, each costing the API a read.

**OG cards and icons are generated, not committed.** `app/opengraph-image.tsx`,
`app/(main)/blogs/[id]/opengraph-image.tsx`, `app/icon.tsx` and `app/apple-icon.tsx` build PNGs
through `next/og`, using the tokens mirrored as hex in [lib/og.ts](client/lib/og.ts) — a manifest or
an `ImageResponse` cannot read a CSS variable, so keep those in step with `globals.css`. Fraunces is
fetched at render time and **cached with a null fallback**: a Google Fonts hiccup must degrade the
card to the built-in face, never fail the route and leave a shared link with no image. Satori
collapses leading and trailing whitespace in strings and ignores flex `gap` here, so spacing inside a
card must be explicit margins.

**Only four pages are client components** — `/login`, `/register`, `/admin`, `/profile` — and all
four are genuinely interactive. Their metadata lives on a sibling `layout.tsx`, because a client
component cannot export `metadata`.

**A row can only have one wrapping link.** `PostRow` carries two destinations — the post and its
author — so the title's `after:absolute after:inset-0` covers the row instead of an outer `<Link>`,
and the author link sits above it by being positioned and later in the DOM. Nesting an `<a>` in an
`<a>` is invalid and browsers silently unnest it. Anything else that needs to be clickable on a row
(the profile page's action menu) goes *outside* `PostRow`, not on top of it.

## Gotchas

- `server/.env` is gitignored — copy [server/.env.example](server/.env.example) first. A fresh clone
  will not boot at all until `MONGODB_URI`, `CLIENT_URL` and a 32-character `JWT_SECRET` are set,
  and the startup error names the offending variable.
- Zod 4 is what installs: `z.email()` / `z.url()`, not `z.string().email()`, and `err.issues`, not
  `err.errors`. Normalise before validating — `z.string().trim().toLowerCase().pipe(z.email())`,
  because `z.email()` rejects an untrimmed address outright.
- Next 16 renamed the `middleware` file convention to `proxy`. Editing `middleware.ts` does nothing;
  the file is [client/proxy.ts](client/proxy.ts) and it exports `proxy`.
- Next 16 makes `params` and `searchParams` **Promises** — `await` them in every page and
  `generateMetadata`.
- Call `notFound()` in `generateMetadata` too, not only in the component. Returning metadata
  successfully lets Next commit a 200 before the page throws, which serves a soft 404.
- `components/ui/index.ts` re-exports the complete surface, but most files import direct paths
  (`@/components/ui/button`). Either works — match the file you are editing.

## Roadmap

Work in progress is tracked in [docs/plan/](docs/plan/README.md), one file per phase, worked in
order. **Read the phase file before touching an area it owns.** Every phase is landed. **10** is
complete on the repo side ([server/render.yaml](server/render.yaml), [README.md](README.md),
[SECURITY.md](SECURITY.md), verified locally under `NODE_ENV=production`) but **not deployed** —
that needs Render/Vercel account access, and it is the only outstanding item in the whole plan.

The plan is a record, not a live spec: where a later decision reversed an earlier one — the
first-run admin claim that Phase 1 removed and that was reinstated atomically — the phase file says
so rather than being rewritten.

Every hot query is index-backed; if you add a list endpoint, `explain("executionStats")` it and
confirm `IXSCAN` with `totalDocsExamined` close to `nReturned` before shipping it.

**Deploy gotchas already encoded.** `PORT` must stay unset on Render (it injects one). `CLIENT_URL`
must be the exact Vercel origin — the CORS allow-list is explicit, and a mismatch surfaces as
`403 Origin not allowed` in the browser console. Run `npm run indexes` once after the first deploy,
since `autoIndex` is off in production.

From here the remaining phases are infrastructural rather than feature work, so they no longer pair a
server and a client change in one commit. `npm run lint` is down to a single warning (react-hook-form's
`watch()` in `BlogForm`, which the React Compiler cannot memoize); treat any new one as a regression.

**Search suggests as you type, from a dedicated endpoint.** `GET /api/blogs/suggest?q=` backs the
combobox in `components/layout/Navbar/SearchForm.tsx`. It is two index-backed queries unioned, not
one: an anchored prefix regex on `titleLower` (which is why that derived, `select: false` column and
its index exist — `$text` stems whole words, so "reac" would never reach "React"), plus the existing
`$text` search for whole words that are not a prefix. A substring regex would answer both at once
and is precisely what no index can serve. New posts get `titleLower` from the model's hooks; posts
that predate the column need `npm run backfill:titles`, or they silently never match the prefix half.

**Search has its own control on mobile, and is no longer in the burger menu.** `MobileSearch`
renders a nav icon that opens a top sheet holding the same `SearchForm`. Search is a task, not a
destination, and burying the site's main way of finding anything behind the menu cost it two extra
interactions.

**The feed is deliberately not interactive.** `PostRow` is a server component showing a static like
count; there is no like button on a list row, and `LikeButton` was deleted rather than rewritten.
Putting one back would force a client boundary into every row and hand each one a `likedByMe` that
the cached anonymous fetch always reports as false.
