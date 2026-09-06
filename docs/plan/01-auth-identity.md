# Phase 1 — Auth & Identity

**Size:** L · **Coupling:** ⚠️ **server + client must ship in the same commit**

**Goal:** the JWT actually gates something, nobody self-promotes to admin, and the auth screens look
like a product.

← [0C — Shell & home page](00c-shell-and-home.md) · [Index](README.md) · Next: [2 — Blogs](02-blogs.md)

---

## What breaks

| Server change | Client that breaks |
|---|---|
| `PUT /users/:id` → `PATCH /users/me` | `authService.update()`, `EditProfileForm.tsx:42` |
| `GET /users` deleted | `authService.getAll()` — currently unused, safe |
| `role` stripped from register body | register admin checkbox + the `/users/check-admin` fetch |

**Dependencies:** none new (zod / helmet / rate-limit came from 0A; RHF + zod from 0B).

---

## Server steps

### 1. `server/src/schemas/user.schema.ts` (new)

```ts
import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(32),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  // NOTE: no `role` — deliberately absent so it can never be supplied
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const updateMeSchema = z.object({
  username: z.string().trim().min(3).max(32).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
}).refine(o => Object.keys(o).length > 0, "Nothing to update");

export const objectIdParam = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id"),
});
```

### 2. `server/src/middleware/validate.ts` (new)

Remember: **Express 5 forbids assigning `req.query`.**

```ts
import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";

declare global {
  namespace Express {
    // Non-optional on purpose: every route that reads req.valid runs validate() first, and
    // declaring it optional would force a `!` at every read site. The middleware assigns it
    // unconditionally below, so the only way to observe it undefined is to read it on a route
    // that never validated — which is a routing bug, not a type-safety one.
    interface Request { valid: { body?: unknown; params?: unknown; query?: unknown } }
  }
}

export const validate = (s: { body?: ZodTypeAny; params?: ZodTypeAny; query?: ZodTypeAny }): RequestHandler =>
  (req, _res, next) => {
    try {
      const valid: Request["valid"] = {};
      if (s.params) valid.params = s.params.parse(req.params);
      if (s.query)  valid.query  = s.query.parse(req.query);   // read-only getter: never assign back
      if (s.body)   valid.body   = s.body.parse(req.body);
      req.valid = valid;
      next();
    } catch (err) { next(err); }
  };
```

Pick one convention and hold it: either read `req.valid.body as LoginInput` in controllers, or skip
the middleware for bodies and call `loginSchema.parse(req.body)` directly in the handler for zero
casts — Express 5 forwards the ZodError automatically either way.

### 3. Close the privilege escalation

- [ ] In `registerUser` ([user.controller.ts:30-88](../../server/src/controllers/user.controller.ts)),
      remove `role` from the destructure at line 31 and the `role === "admin" ? "admin" : "user"`
      expression at line 65 **entirely**.

> Today the body's `role` is honored as long as no admin row exists. First POST wins — and two
> concurrent POSTs both win.

### 4. Admin bootstrap via seed script

- [ ] `server/src/scripts/seedAdmin.ts` (new) — reads `ADMIN_EMAIL` / `ADMIN_PASSWORD` from env,
      idempotent `findOneAndUpdate` upsert.
- [ ] `"seed:admin": "tsx src/scripts/seedAdmin.ts"` in `server/package.json`.
- [ ] **Delete `checkAdminExists` and `GET /users/check-admin`.** This removes an entire attack
      surface and an entire client code path.

### 5. Fix login and delete the hardcoded secret

- [ ] `User.findOne({ email }).select("+password")` — required after 0A step 16 added `select: false`.
- [ ] Use `env.JWT_SECRET` / `env.JWT_EXPIRES_IN`.
- [ ] **Delete the `|| "your-secret-key"` fallback** at `user.controller.ts:119` **and** at
      [auth.middleware.ts:35](../../server/src/middleware/auth.middleware.ts). The env schema makes
      them unreachable, but a hardcoded secret literal in the repo is what a reviewer greps for first.

### 6. `server/src/middleware/rateLimit.ts` (new)

```ts
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Too many attempts. Try again in 15 minutes." },
});
export const writeLimiter  = rateLimit({ windowMs: 60_000, limit: 30, /* ... */ });
export const globalLimiter = rateLimit({ windowMs: env.RATE_LIMIT_WINDOW_MS, limit: env.RATE_LIMIT_MAX, /* ... */ });
```

- [ ] `authLimiter` on `POST /users/login` and `POST /users`
- [ ] Every `message` must be `{ message }`-shaped to match the client contract

> `app.set("trust proxy", 1)` from 0A is a **hard prerequisite** — `npm i express-rate-limit` installs
> **v8**, which validates the proxy setting at startup and will otherwise key every Render request to
> the same proxy IP (one shared bucket for all your users). v8 also defaults `standardHeaders` to
> `draft-8`; pin `"draft-7"` explicitly if you want the widely-supported `RateLimit-*` headers.

### 7. `optionalAuthenticate` in `auth.middleware.ts`

- [ ] Same as `authenticate` but calls `next()` when there's no header. Phases 2 and 4 need it to
      compute `likedByMe` for logged-in viewers of public pages.

### 8. `server/src/middleware/ownership.middleware.ts` (new)

The reusable chain link every remaining phase depends on.

```ts
import type { RequestHandler } from "express";
import type { Model } from "mongoose";
import { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, forbidden, notFound, unauthorized } from "../utils/AppError.js";

export const requireOwnership = (
  model: Model<any>, ownerField: string, { param = "id", allowAdmin = true } = {},
): RequestHandler =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user) throw unauthorized();
    const id = req.params[param];
    if (!id || !isValidObjectId(id)) throw badRequest("Invalid id");

    const doc = await model.findById(id).select(ownerField).lean();
    if (!doc) throw notFound();

    const owner = String((doc as Record<string, unknown>)[ownerField]);
    if (owner !== req.user.userId && !(allowAdmin && req.user.role === "admin")) throw forbidden();
    next();
  });
```

### 9. Rewrite `server/src/routers/userRouter.ts`

```ts
userRouter.post("/",      authLimiter, uploadProfilePicture, validate({ body: registerSchema }), registerUser);
userRouter.post("/login", authLimiter, validate({ body: loginSchema }), loginUser);
userRouter.get("/me",     authenticate, getMe);
userRouter.patch("/me",   authenticate, uploadProfilePicture, validate({ body: updateMeSchema }), updateMe);
userRouter.delete("/me",  authenticate, deleteMe);
userRouter.get("/:id",    validate({ params: objectIdParam }), getPublicUserById);

// DELETED: GET /       (dumped every user incl. emails, unauthenticated, unpaginated)
// DELETED: PUT /:id    (no auth, no ownership → anyone edits anyone)
// DELETED: DELETE /:id (no auth, no ownership; also orphaned all blogs/comments/likes)
```

> **Upload middleware now comes after auth.** Today `uploadProfilePicture` runs first at
> `userRouter.ts:19` and `:31`, which is an unauthenticated disk-fill primitive.

> ⚠️ **Register is the one route that can't have auth in front of it.** `uploadProfilePicture` still
> runs before `validate`, because with `multipart/form-data` `req.body` is empty until multer has
> parsed it — so an invalid registration still writes a file to disk before being rejected. Three
> mitigations, in order of value:
> 1. `authLimiter` caps it at 10 attempts per IP per 15 minutes (already in this step)
> 2. [Phase 7](07-cloudinary.md) switches to `memoryStorage`, so nothing touches disk at all —
>    which is the real fix
> 3. Delete the orphaned file in the controller's failure path, as the existing code already does
>
> Don't try to solve it by reordering the middleware; it can't be done for multipart bodies.

- [ ] `getPublicUserById` must `.select("username profilePicture createdAt")`. Today
      `getUserById:157` does `.select("-password")`, which still hands email, role and `isBlocked`
      to anonymous callers.

### 10. `getMe` / `updateMe` / `deleteMe`

- [ ] All three read `req.user.userId`, never `req.params`.
- [ ] `deleteMe` does the full cascade that `deleteUser:198` skips today (it deletes the user and
      leaves every blog, comment and like orphaned; only `deleteUserAdmin` cascades).
- [ ] Wrap the cascade in a session/transaction:
      ```ts
      const session = await mongoose.startSession();
      try { await session.withTransaction(async () => { /* ... */ }); }
      finally { await session.endSession(); }
      ```

> ⚠️ **Transactions require a replica set.** MongoDB Atlas is fine; a standalone local `mongod` is
> not. Either run `mongod --replSet rs0` locally, or make the transaction opt-in via env.

---

## Client steps

### 11. `client/lib/validation/auth.ts` (new)

The *same* zod schemas as the server, shapes kept literally identical so client-side errors match
server rejections.

```ts
export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "At least 3 characters").max(32),
  email: z.string().email(),
  password: z.string().min(8, "At least 8 characters"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  path: ["confirmPassword"], message: "Passwords don't match",
});
```

> Register currently validates only `password !== confirm` and `length < 6` at
> `register/page.tsx:60-67`. The min moves to 8 to match the server.

### 12. Rewrite `app/(auth)/login/page.tsx`

- [ ] react-hook-form + `zodResolver` + shadcn `Form` / `Input` / `Button`
- [ ] **Critical fix at line 36:** the catch replaces **any** failure — a 500, a network timeout, a
      CORS rejection — with `"Invalid email or password. Please try again."`. Use `getErrorMessage`
      from [lib/errorHandler.ts](../../client/lib/errorHandler.ts), which already exists and is used
      at only 2 of ~20 catch sites.
- [ ] Password visibility toggle (lucide `Eye` / `EyeOff`)
- [ ] `role="alert"` on the error region
- [ ] Honor `?next=` for the post-login redirect

### 13. Rewrite `app/(auth)/register/page.tsx`

- [ ] Same RHF + zod treatment
- [ ] Replace the `<div onClick>` avatar picker at line 135 (no `role`, no `tabIndex`, no key
      handler) with a real `<label htmlFor>` wrapping a hidden `<input type="file">` — that buys
      keyboard and screen-reader support for free
- [ ] Add client-side file size and type checks
- [ ] Remove the admin checkbox and the `checkAdminExists` effect at lines 29-33

### 14. `client/services/authService.ts`

- [ ] `update(id, fd)` → `updateMe(fd)` hitting `PATCH /users/me`
- [ ] Delete `getAll`
- [ ] `delete(id)` → `deleteMe()`
- [ ] Update the call site at `EditProfileForm.tsx:42`

### 15. `client/middleware.ts` (new) — read the caveat first

Next middleware runs on the Vercel edge and can only read cookies on *its own* domain. Your JWT lives
in `localStorage`, and Phase 10 puts the API on a different origin (`*.onrender.com`), so an httpOnly
cookie set by the API would be invisible to the middleware.

- [ ] On login/logout the client writes a non-sensitive cookie on the **client** domain:
      `bm_session=1` and `bm_role=user|admin`
- [ ] Middleware uses it purely to redirect `/profile`, `/blogs/create`, `/admin` to `/login` before
      render — a UX optimization, nothing more
- [ ] **Document in the code that this cookie is a hint and is trivially forgeable.** Real
      enforcement is the server-side work above.

> Later upgrade if you add refresh tokens: a Vercel rewrite (`/api/:path*` →
> `https://api.example.com/api/:path*`) makes the API same-origin, so a real httpOnly cookie works
> and middleware can verify it with `jose`. Costs a function hop per call and complicates multipart
> uploads.

### 16. `client/app/providers.tsx`

- [ ] Implement the `auth:unauthorized` / `auth:blocked` listeners from 0B step 8: `logout()`, clear
      the hint cookie, toast, redirect to `/login?next=`.

---

## Verification

```bash
# unauthenticated writes are now rejected
curl -i -X PATCH localhost:5000/api/users/me                     # 401
curl -i localhost:5000/api/users                                 # 404 (route gone)

# privilege escalation is closed
curl -i -X POST localhost:5000/api/users \
  -F username=x -F email=x@x.com -F password=password123 -F role=admin
# → 201 with "role":"user"

# validation
TOKEN_A=$(curl -s -X POST localhost:5000/api/users/login -H 'content-type: application/json' \
  -d '{"email":"a@x.com","password":"password123"}' | jq -r .token)
curl -i -X PATCH localhost:5000/api/users/me -H "Authorization: Bearer $TOKEN_A" \
  -H 'content-type: application/json' -d '{"username":"ab"}'     # 400, min 3

# rate limit
for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code} " -X POST localhost:5000/api/users/login \
  -H 'content-type: application/json' -d '{"email":"a@x.com","password":"wrong"}'; done
# → 400 ×10 then 429 429
```

Browser:

- [ ] Register with a weak password → inline field error, not a banner
- [ ] Log in with a wrong password → the message is the server's, not a hardcoded string
- [ ] **Stop the server and log in** → a network error message, *not* "Invalid email or password"
- [ ] Hard-refresh `/profile` while logged in → no bounce to `/login`
- [ ] Tab through both forms → labels announce, focus rings visible


---

## Landed — deviations from the plan above

Four things were done differently. Each was a deliberate call, not an oversight.

**`client/proxy.ts`, not `client/middleware.ts`.** Next 16 renamed the file convention; a
`middleware.ts` still works but warns on every build, and having both is a hard error. Same edge
runtime, same API, export named `proxy`.

**Two rate-limit buckets, not one shared `authLimiter`.** Each `rateLimit()` call owns its store, so
one instance mounted on both `/users` and `/users/login` would have let ten fumbled passwords also
block account creation from that IP. `loginLimiter` and `registerLimiter` are separate instances.

**Upload cleanup moved to the error middleware.** Validation now rejects a bad signup *before* the
controller runs, so the controller's own cleanup path could no longer fire and every invalid
multipart request would leak a file. `errorHandler` calls `discardUpload(req.file)` on any failed
request; a controller that has already written the file into a row calls `keepUpload(req)` to opt
out. This covers Phases 2 and 5 for free.

**The session-hint cookie is written inside `authStore`,** not at each call site. There are five
places that log out; one forgetting to clear the cookie would leave `proxy.ts` treating a signed-out
visitor as signed in. `onRehydrateStorage` re-asserts it too — localStorage has no expiry but the
cookie does, so a returning visitor can hold a valid session and no cookie.

Two smaller notes:

- **Failed logins answer 400, not the semantically-nicer 401.** The client's axios interceptor
  treats every 401 as an expired session and force-logs-out — nonsense on a form that was never
  authenticated. The plan's verification block expects 400 here too.
- **`GET /users/check-admin` answers 400, not 404.** The route is gone, but `/users/:id` now catches
  the path and rejects `check-admin` as a malformed ObjectId. Consistent with every other id route;
  the endpoint no longer returns `{ adminExists }`, which is what mattered.

**`hooks/useAuth.ts` deleted** per 0B step: "keep it only if Phase 1 routes login through it." It
doesn't — react-hook-form's `isSubmitting` replaced its loading flag, and it had zero consumers.

### Not verified end-to-end

No MongoDB is reachable from this environment, so everything that needs a live DB — actual
registration, the `role=admin` strip returning `201 … "role":"user"`, `seed:admin`, and the
`deleteMe` cascade — is **unrun**. What was verified is the 13-case routing/auth/validation matrix
that short-circuits before Mongo (deleted routes 404, `/me` 401s, validation 400s, both rate-limit
buckets), plus a clean `tsc`, `eslint` and production build on both packages.
