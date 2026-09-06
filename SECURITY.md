# Security model

How authentication, authorisation and input handling actually work in this app — and, where a
choice has a known weakness, what that weakness is.

---

## Authentication

**Bearer JWT, stored in `localStorage`.** Login returns a token; the axios request interceptor in
`client/lib/api.ts` reads it out of the persisted zustand store and sets `Authorization: Bearer …`.

`authenticate` (`server/src/middleware/auth.middleware.ts`) verifies the signature and then
**re-reads `role` and `isBlocked` from MongoDB on every request**. Two consequences:

- Blocking an account takes effect on its *next* request. It does not wait for the token to expire.
- The `role` claim inside a token is never trusted. Promoting or demoting someone applies immediately
  and cannot be forged by minting a token with `role: "admin"`.

`optionalAuthenticate` is the same but lets anonymous callers through, for public routes that
personalise their response.

**Known weakness.** A token in `localStorage` is readable by any script that runs on the page, so an
XSS bug is a token theft. It was chosen because the API is on a different origin from the client, and
an httpOnly cookie set by the API would not be sent by the browser without a same-origin rewrite.
Moving to httpOnly cookies is the single most valuable hardening step left.

**Failed logins return 400, not 401.** The client treats *every* 401 as an expired session and force
logs out; a 401 from the login form would fire that on a visitor who was never signed in. Login also
returns one message for "no such account" and "wrong password" alike, so the form is not an account
enumeration oracle, and the blocked-account check happens *after* the password check so a blocked
account cannot be identified without its credentials.

---

## Authorisation

**Identity comes from the token. Never from a request body, never from a URL segment.**

Earlier versions read `userId` out of the JSON body, which meant anyone could act as anyone. Every
such route is gone:

| Removed | Replaced by |
|---|---|
| `POST /comments` with `userId` in the body | `POST /comments/blog/:blogId`, author from the token |
| `POST /likes` + `/likes/unlike` with `userId` | `POST /likes/:blogId/toggle` |
| `GET /likes/check/:blogId/:userId` | `GET /likes/me/:blogId` |
| `PUT`/`DELETE /users/:id` | `PATCH`/`DELETE /users/me` |
| `GET /users` (every user's email, unauthenticated) | deleted |

Ownership is a reusable middleware, `requireOwnership(Model, ownerField)`, which **answers 404 before
403** — responding 403 for a row that does not exist would let a caller probe which ids are real.

Deleting a comment admits three principals: its author, the author of the post it sits under, and an
admin. Editing admits only its author — an admin can remove a comment but must not rewrite words that
stay published under someone else's name.

**Role is never taken from a request body.** `registerSchema` has no `role` key and `z.object` strips
unknown keys, so `role: "admin"` in a signup silently creates a normal user.

**First-run admin claim.** While the application has no administrator, the register form offers to
claim it, and `POST /api/users` honours `claimAdmin=true` exactly once. The window closes the moment
an admin exists and never reopens.

The claim is made atomic by a unique sparse index on `bootstrapAdmin`, so concurrent signups cannot
both succeed — a check-then-create would have a race, and that race is the original reason this
feature was removed. Verified with eight simultaneous claims: one admin, seven ordinary users, no
failed signups.

**The residual risk is inherent to the pattern, not to the implementation:** between deploying and
claiming, whoever registers first can take the administrator account. Claim it immediately after
deploying, or use `npm run seed:admin` and never expose the option at all — with an admin already
present, `bootstrap-status` reports `true` from the first request and the form never offers it.

**One admin always survives.** No admin route can act on the caller's own account, so any admin they
*can* target implies a second admin exists. The one path that could lock everybody out of the
dashboard is self-service account deletion, and `DELETE /users/me` refuses when the caller is the last
remaining admin.

### The client-side gate is not authorisation

`client/proxy.ts` redirects signed-out visitors away from `/profile`, `/blogs/create` and `/admin`
before React renders. It reads a **non-sensitive, trivially forgeable cookie** written by the auth
store. It exists only to avoid a flash of protected content. Nothing behind those routes is secret;
the pages fetch their data from the API, which re-checks the token every time. The same is true of
every `canEdit`-style flag in the UI: it decides what to *show*, never what is *allowed*.

---

## Input handling

**Zod validates every request**, applied in the router and landing on `req.valid` — never back on
`req.query`, which is a getter-only lazy property in Express 5.

This is also the defence against operator injection: a schema that expects a string rejects
`{ $ne: null }` outright. `express-mongo-sanitize` is deliberately **not** installed — it mutates
`req.query` and throws on Express 5.

Every list endpoint is bounded. `?limit=1000000` is a 400, and so is `?page=-5`, which would otherwise
produce a negative `$skip` that Mongo rejects as a 500. Sort keys are enums, never raw field names —
accepting one would let a caller sort by `password`.

Admin search passes user input through `escapeRegex` before it reaches `new RegExp`. Unescaped, it is
both a wrong-results bug and a catastrophic-backtracking denial of service.

**Rate limits** are per-route with separate stores: a global limiter, separate login and register
limiters (each `rateLimit()` call owns its own store, so sharing one instance would let fumbled
passwords block account creation from the same IP), and a write limiter on content routes. The
credential limiters skip successful requests, so a legitimate user is never locked out.

---

## Uploads

multer buffers in memory; nothing is written to a local filesystem.

`file.mimetype` is the client's claim, not a fact — a text file renamed `.jpg` and posted as
`image/jpeg` passes multer's filter. The real check reads the buffer's **magic bytes**
(`fileTypeFromBuffer`) before anything is sent to Cloudinary, and rejects SVG outright, since an SVG
is a document that can carry script.

Both size limits are 5 MB and are enforced on the client too, so an oversized file never leaves the
machine.

---

## Data exposure

Responses use **allow-list projections**, never `select("-password")`. Excluding one field still ships
every field added later. The public author endpoint returns `username`, `profilePicture` and
`createdAt` only — no email, role or block status — and comment and like payloads carry the same
narrow author shape.

Per-user responses are sent `Cache-Control: private, no-store`; anonymous ones are cacheable. Getting
this backwards would let a shared cache serve one reader's `likedByMe` to everybody.

---

## Reporting

This is a portfolio project with no production users. If you find something anyway, please open an
issue describing the problem and how to reproduce it.
