# Marginalia

A small publication, and the record of building one. Write posts in Markdown, read them on a
typographic surface designed for it, and moderate the whole thing from an admin dashboard.

Built as a MERN app and then taken apart and rebuilt: every route authorises server-side, every hot
query is index-backed, uploads live on a CDN, and every page is server-rendered and indexable.

**Stack** — Next.js 16 (App Router, React 19, Tailwind v4, Base UI) · Express 5 · MongoDB/Mongoose 9 ·
TypeScript throughout · Cloudinary · JWT

---

## Contents

- [Architecture](#architecture) · [Running it locally](#running-it-locally) ·
  [Environment](#environment) · [Deployment](#deployment) · [Security model](#security-model) ·
  [What I would do next](#what-i-would-do-next)

---

## Architecture

```
                      ┌──────────────────────────────────────────┐
   browser ──────────▶│  Next.js 16 (Vercel)                     │
                      │                                          │
                      │  proxy.ts ── redirects signed-out users   │
                      │              away from /profile, /admin   │
                      │              (a UX hint, NOT authorisation)│
                      │                                          │
                      │  Server Components ──▶ lib/server-api.ts │──┐ anonymous,
                      │    /, /blogs, /blogs/[id], /users/[id]    │  │ cacheable
                      │                                          │  │
                      │  Client Components ──▶ services/ ──▶ axios│──┤ Bearer JWT
                      │    feed appending, forms, admin, likes    │  │
                      └──────────────────────────────────────────┘  │
                                                                    ▼
                      ┌──────────────────────────────────────────────────────┐
                      │  Express 5 (Render)                                  │
                      │                                                      │
                      │  helmet · cors allow-list · rate limits · pino       │
                      │      ↓                                               │
                      │  routers ─▶ validate(zod) ─▶ authenticate ─▶         │
                      │             requireOwnership ─▶ controllers          │
                      │      ↓                              ↓                │
                      │  MongoDB Atlas                Cloudinary             │
                      └──────────────────────────────────────────────────────┘
```

**Two data paths, on purpose.** Pages that anyone can read are fetched by server components with
plain `fetch` and no token, which is what makes those responses cacheable and what puts real content
in the HTML for crawlers. Anything user-specific — appending feed pages, posting, liking, the admin
tables — goes through axios from the browser with the Bearer token attached.

Some decisions worth calling out:

- **Authorisation is server-side and nothing else counts.** `proxy.ts` redirects signed-out visitors
  before render, but it reads a forgeable cookie and is purely cosmetic. Every real check is
  `authenticate` → `requireOwnership` on the API.
- **The blog list is one aggregation**, not a query per row: author, comment and like counts,
  `likedByMe`, reading time and a Markdown-stripped excerpt come back in a single `$facet` pipeline.
- **The feed pages by cursor, the tables page by number.** `?after=<ISO date>` seeks into the
  `createdAt` index and computes no total; `?page=` stays where jumping to a page matters. At 500
  posts, page 50 examines 500 documents to return 9 — the cursor examines 10.
- **Markdown is sanitised on render** (`rehype-sanitize`), through one component shared by the reader
  and the editor preview, so the two cannot diverge on what publishes.
- **Uploads never touch the filesystem.** multer buffers in memory, the buffer's magic bytes are
  checked (a `.jpg` that is really a text file is rejected), and Cloudinary stores it.

Design and product constraints live in [DESIGN.md](DESIGN.md) and [PRODUCT.md](PRODUCT.md);
[CLAUDE.md](CLAUDE.md) is the working guide to the codebase.

---

## Running it locally

Two independent packages. There is no root `package.json` — install and run each separately.

**Prerequisites:** Node 22–24 (see `server/.nvmrc`), a MongoDB connection string (Atlas free tier is
fine), and a Cloudinary account.

> **The Cloudinary key must be able to write.** Cloudinary's newer console can issue keys scoped to
> specific permissions, and a read-only one authenticates perfectly and then rejects every upload
> with a 403 — so the app works until somebody attaches a cover image. Run
> `npm run check:cloudinary` after filling in `.env`; it uploads a 1×1 pixel, deletes it, and tells
> you exactly what is wrong if it cannot.

```bash
# 1. API
cd server
cp .env.example .env          # then fill it in — the server will not boot until you do
npm install
npm run dev                   # http://localhost:5000

# 2. Client, in a second terminal
cd client
npm install
npm run dev                   # http://localhost:3000
```

Both must be running. The API refuses to start with a missing or malformed variable and names the
offending one, rather than failing later in a confusing way.

**Make yourself an admin.** While the database has no administrator, the register form offers to
claim it — sign up at `/register` and tick *"Make this the administrator account"*. The option
disappears the moment an admin exists and never comes back.

A `role` field in the request body is still ignored; `claimAdmin` only *asks*, and the server grants
it solely when no admin exists. The claim is made atomic by a unique index, so two simultaneous
signups cannot both win.

The script is still there, and is the better choice for a deployment you would rather not leave
claimable:

```bash
cd server
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a strong one' npm run seed:admin
```

Either way, once one admin exists they promote and demote others from the dashboard.

### Scripts

| | |
|---|---|
| `server` | `dev` · `build` · `start` · `typecheck` · `test` · `test:watch` · `seed:admin` · `indexes` · `check:cloudinary` · `migrate:uploads` |
| `client` | `dev` · `build` · `start` · `lint` |

`npm run indexes` runs `syncIndexes()`. Index building is disabled on boot in production — doing it
automatically is an unbounded write against a live collection — so schema index changes are applied
deliberately after a deploy. It also **drops** indexes no longer declared in a schema.

### Tests

```bash
cd server && npm test          # API integration suite
cd client && npm run test:e2e  # browser suite, three viewports
```

The browser suite needs both processes running, and the API's rate limits raised — a full run
registers an account per test and comfortably exceeds the production default of 300 requests per 15
minutes:

```bash
cd server && RATE_LIMIT_MAX=100000 RATE_LIMIT_WINDOW_MS=60000 npm run dev
```

65 integration tests over the real Express app via supertest, against an in-memory MongoDB **replica
set** — a replica set rather than a standalone because the cascade deletes run in transactions, and
testing them on a standalone would pass locally and diverge from production.

The suite is deliberately narrow. It covers the 401/403/200 ownership matrix, token handling
(forged signatures, an `admin` claim in an otherwise valid token, blocked accounts), validation
bounds and operator injection, the cascades, the like toggle under concurrency, the first-run admin
claim under eight simultaneous requests, and the rate limiters. That is the class of bug this codebase's history is made of; it is not a coverage target.

It has been checked negatively as well: removing `requireOwnership` from one blog route turns it red
on exactly the test that should fail. A suite that has never failed hasn't proven anything.

There are no client-side tests — `npm run lint` and `tsc --noEmit` are the client's gate in CI.

---

## Environment

### `server/.env` — see [`.env.example`](server/.env.example)

| Key | Required | Notes |
|---|---|---|
| `MONGODB_URI` | ✅ | Atlas SRV string |
| `JWT_SECRET` | ✅ | minimum 32 characters; rotating it logs everyone out |
| `CLIENT_URL` | ✅ | the browser origin allowed by CORS, scheme included |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | ✅ | the key needs read **and** write |
| `PORT` | | defaults to 5000; Render injects its own |
| `CORS_ORIGINS` | | comma-separated extra origins |
| `ALLOW_VERCEL_PREVIEWS` | | `true` allows `https://<any>.vercel.app` |
| `JWT_EXPIRES_IN` · `LOG_LEVEL` · `RATE_LIMIT_*` | | sensible defaults |
| `ENABLE_TRANSACTIONS` | | on for Atlas, off for a standalone `mongod` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_USERNAME` | | read only by `seed:admin` |

Booleans come from a string enum rather than `z.coerce.boolean()`, because `Boolean("false")` is
`true` and coercion would read an explicit `false` as on.

### `client` — all optional, all defaulted for local dev

| Key | Notes |
|---|---|
| `NEXT_PUBLIC_API_URL` | default `http://localhost:5000/api` |
| `NEXT_PUBLIC_BASE_URL` | default `http://localhost:5000` |
| `API_URL` | server-side only; lets RSC fetches use an internal address |
| `NEXT_PUBLIC_SITE_URL` | canonical/OG base. Falls back to `VERCEL_URL` on previews |

---

## Deployment

API on **Render**, client on **Vercel**. [`server/render.yaml`](server/render.yaml) is a committed
blueprint for the API service.

1. **Deploy the API first.** Root directory `server`, build `npm ci && npm run build`, start
   `npm start`, health check path `/api/health`. Set the variables above.
   Allow `0.0.0.0/0` in Atlas — Render's free tier has no static egress IP — and use a strong
   database password.
2. **Confirm** `GET /api/health` returns `200` with `{"status":"ok","db":"connected"}`.
3. **Create the first admin — before sharing the URL.** Until one exists, the register form offers
   the administrator account to whoever signs up first. Either claim it yourself immediately, or
   close the window ahead of time by seeding. Render's shell is a paid feature, so run the script
   from your own machine against the production database:
   ```bash
   cd server
   MONGODB_URI="<atlas srv>" ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' npm run seed:admin
   ```
   It is idempotent. Seeding first is the safer order: `bootstrap-status` then reports `true` from
   the very first request and the setup option is never shown.
4. **Deploy the client.** Root directory `client`; the Next preset is detected automatically. Set
   `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_BASE_URL`, `API_URL` and `NEXT_PUBLIC_SITE_URL`.
5. **Set `CLIENT_URL` on the API** to the real Vercel domain and redeploy. A
   `403 Origin not allowed` in the browser console means this step was missed — the allow-list is
   explicit by design.
6. **Run `npm run indexes`** against the production database once.

> **Free-tier cold starts.** Render spins the instance down after 15 minutes idle, and the first
> request afterwards can take ~50 seconds. If the site looks broken on first load, it is waking up.
> Server components fail soft: the archive retries from the browser rather than erroring the page.

---

## Security model

Full detail in [SECURITY.md](SECURITY.md). In short:

- **Bearer JWT** in `localStorage`. `authenticate` re-reads `role` and `isBlocked` from the database
  on every request, so a block takes effect immediately and the role in a token is never trusted.
- **Identity always comes from the token**, never from a request body or a URL segment.
- **Ownership is a middleware** — `requireOwnership(Model, field)` — that answers 404 before 403 so
  ids cannot be probed for existence.
- **Role never comes from a request body.** `role` is not in the register schema and unknown keys
  are stripped. The one exception is the first-run claim, which the server grants only while no
  admin exists, guarded by a unique index so concurrent claims cannot both succeed.
- **Zod validates every input** and is the defence against operator injection; admin search escapes
  regex metacharacters.
- helmet, an explicit CORS allow-list, per-route rate limits, and magic-byte validation on uploads.

---

## What I would do next

- **Client tests.** The server has an integration suite; the client has only lint and typecheck.
  Playwright over the three or four journeys that matter would close that.
- **httpOnly cookie auth.** Bearer-in-localStorage is XSS-exposed. Moving to httpOnly cookies needs a
  same-origin rewrite so the browser will send them, which is a deployment change more than a code one.
- **Signed direct-to-Cloudinary uploads.** The API issues a signature and the file never passes
  through it — halves egress and sidesteps request body limits.
- **Atlas Search** for the admin user lookup. Substring matching cannot use a B-tree index, so that
  one query still scans the user collection; it is bounded and admin-only, but it is the one query
  that does not scale.
- **A real editor.** The Markdown textarea works, but a preview-beside-source editor would suit the
  product better.
