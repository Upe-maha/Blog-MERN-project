# Phase 0A — Server foundation

> ✅ **Complete.** Verified on branch `production-hardening`: typecheck clean, build clean,
> full register → login → blog → comment → like → delete round-trip passing, health check
> returning 200/connected and 503/degraded, graceful shutdown on SIGTERM.

**Size:** L · **Coupling:** none — no route contracts change, the current client keeps working

**Goal:** every later phase can `throw notFound()`, read `env.X` type-safely, and log structurally.

← [Index](README.md) · Next: [0B — Client foundation](00b-client-foundation.md)

---

## Dependencies

```bash
cd server
npm i zod helmet express-rate-limit pino pino-http compression
npm i -D pino-pretty @types/compression
npm rm bcryptjs @types/mongoose nodemon
```

Why the removals: `bcryptjs` is installed but never imported (only `bcrypt` is).
`@types/mongoose@5.11.96` is a deprecated stub for Mongoose 5 that actively lies to the compiler
about Mongoose 9. `nodemon` goes because step 15 replaces it with `tsx watch`.

---

## Steps

### 1. Validated environment

- [x] Replace `server/src/env.ts` (currently 5 lines of side-effect dotenv, untracked) with a
      validated export. Keep the filename so `index.ts`'s import-order fix stays intact.

```ts
import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be >= 32 chars"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CLIENT_URL: z.string().url(),
  CORS_ORIGINS: z.string().optional(),              // comma-separated extras
  ALLOW_VERCEL_PREVIEWS: z.enum(["true","false"]).default("false").transform(v => v === "true"),
  LOG_LEVEL: z.enum(["fatal","error","warn","info","debug","trace"]).default("info"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(300),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const i of parsed.error.issues) console.error(`  ${i.path.join(".")}: ${i.message}`);
  process.exit(1);
}
export const env = parsed.data;
```

> ⚠️ **Not `z.coerce.boolean()`.** It is `Boolean(value)`, and `Boolean("false") === true`, so
> `ALLOW_VERCEL_PREVIEWS=false` would parse as **true** and open CORS to every `*.vercel.app` origin.
> The `z.enum(...).transform(...)` above is the correct spelling. Same trap for any future boolean env var.

> ⚠️ Your current `JWT_SECRET` is almost certainly under 32 chars. Generate a new one now, while the
> user table is small — **every existing token is invalidated**, so everyone gets logged out once.
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
> ```

### 2. Document the environment

- [x] Create `server/.env.example` (new, committed). `PORT` is read at `index.ts:5` but is missing
      from the real `.env` today. No `.env.example` exists at all, so a fresh clone starts with no
      environment.

### 3. Stop tracking uploads

- [x] Add `uploads/` to `server/.gitignore`. Nothing is tracked yet, so this is purely preventive —
      but it stops the first upload from being committed.

### 4. `server/src/utils/AppError.ts` (new)

```ts
export class AppError extends Error {
  constructor(public readonly statusCode: number, message: string, public readonly details?: unknown) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace?.(this, AppError);
  }
}
export const badRequest   = (m: string, d?: unknown) => new AppError(400, m, d);
export const unauthorized = (m = "Authentication required")             => new AppError(401, m);
export const forbidden    = (m = "You don't have permission to do that")=> new AppError(403, m);
export const notFound     = (m = "Not found")                           => new AppError(404, m);
export const conflict     = (m: string)                                 => new AppError(409, m);
```

### 5. `server/src/utils/asyncHandler.ts` (new)

```ts
import type { Request, Response, NextFunction, RequestHandler } from "express";
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => { void Promise.resolve(fn(req, res, next)).catch(next); };
```

### 6. `server/src/utils/logger.ts` (new)

- [x] pino with `redact: { paths: ["req.headers.authorization", "req.headers.cookie", "*.password"],
      censor: "[redacted]" }` and a `pino-pretty` transport **only** in development.

### 7. `server/src/middleware/error.middleware.ts` (new)

One place, replacing 21 duplicated try/catch blocks.

```ts
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let status = 500, message = "Internal server error";
  let details: unknown;

  if (err instanceof AppError)        { status = err.statusCode; message = err.message; details = err.details; }
  else if (err instanceof ZodError)   { status = 400; message = "Validation failed";
                                        details = err.issues.map(i => ({ path: i.path.join("."), message: i.message })); }
  else if (err instanceof MulterError){ status = 400;
                                        message = err.code === "LIMIT_FILE_SIZE" ? "File is too large" : `Upload failed (${err.code})`; }
  else if (err instanceof mongoose.Error.CastError)       { status = 400; message = "Invalid identifier"; }
  else if (err instanceof mongoose.Error.ValidationError) { status = 400; message = "Validation failed";
                                        details = Object.values(err.errors).map(e => e.message); }
  else if ((err as { code?: number }).code === 11000)     { status = 409; message = "That value is already in use"; }

  if (status >= 500) logger.error({ err, method: req.method, url: req.originalUrl }, "unhandled error");
  else               logger.warn({ msg: message, method: req.method, url: req.originalUrl }, "request failed");

  res.status(status).json({ message, ...(details !== undefined ? { details } : {}) });
};
```

### 8. Harden `server/src/config/multer.ts`

- [x] `cb(new Error(...))` at line 47 → `cb(new AppError(400, "Invalid file type..."))`, and
      `(req: any, ...)` at line 41 → `(_req: Request, ...)`. With step 7 this turns today's raw HTML
      500 into a clean `400 { message }`.
- [x] **Derive the extension from the mimetype, not the filename.** Today
      `path.extname(file.originalname)` is taken verbatim, so `payload.svg` and `x.html` land in a
      statically-served directory — a stored-XSS vector.
      ```ts
      const EXT_BY_MIME: Record<string, string> = {
        "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp",
      };
      ```
- [x] `Math.round(Math.random() * 1e9)` at line 34 is not collision-safe → `crypto.randomUUID()`.

### 9. `server/src/config/imageStorage.ts` (new) — the Phase 7 seam

```ts
export type StoredImage = { url: string; publicId?: string };

export async function persistUpload(file: Express.Multer.File, folder: "blogs" | "profiles"): Promise<StoredImage> {
  return { url: `/uploads/${folder}/${file.filename}` };   // Phase 7 replaces this body only
}
export async function removeStored(img?: { url?: string; publicId?: string }) { /* fs.unlink today */ }
```

- [x] Route every controller through these instead of building `/uploads/...` strings inline. There
      are currently **three copies** of `getImageUrl` and three of `deleteImage`/`deleteFile` across
      `user.controller.ts`, `blog.controller.ts` and `admin.controller.ts`. Doing this now makes
      Phase 7 a one-file change.

### 10. Rebuild the middleware stack in `server/src/app.ts`

This exact order matters.

```ts
app.set("trust proxy", 1);                    // required on Render for real client IPs
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));  // while /uploads is served
app.use(pinoHttp({ logger }));
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use("/api", globalLimiter);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), { maxAge: "7d", index: false, dotfiles: "deny" }));
// ... routers ...
app.get("/api/health", healthHandler);
app.use(notFoundHandler);
app.use(errorHandler);                        // MUST be last
```

### 11. CORS allow-list

Replaces `origin: process.env.CLIENT_URL` at [app.ts:14](../../server/src/app.ts#L14). When
`CLIENT_URL` is unset, `origin: undefined` makes the `cors` package reflect *any* origin — combined
with `credentials: true` that is the classic misconfiguration.

```ts
const allowed = new Set([env.CLIENT_URL, ...(env.CORS_ORIGINS?.split(",").map(s => s.trim()).filter(Boolean) ?? [])]);
const previewRe = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

const corsOptions: CorsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);                        // curl / server-to-server
    if (allowed.has(origin)) return cb(null, true);
    if (env.ALLOW_VERCEL_PREVIEWS && previewRe.test(origin)) return cb(null, true);
    cb(new AppError(403, "Origin not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
```

### 12. Honest health check

Replaces the static OK at [app.ts:31-33](../../server/src/app.ts#L31), which returns 200 even when
Mongo is down — so Render would green-light a broken deploy.

```ts
const STATES = ["disconnected", "connected", "connecting", "disconnecting"] as const;
export const healthHandler: RequestHandler = (_req, res) => {
  const s = mongoose.connection.readyState;
  res.status(s === 1 ? 200 : 503).json({
    status: s === 1 ? "ok" : "degraded", db: STATES[s] ?? "unknown", uptime: process.uptime(),
  });
};
```

### 13. Fix startup and shutdown in `server/src/index.ts`

`connectDB()` at line 7 is a floating promise, so the server listens before Mongo is up. Lines 9-11
define a stray `app.get("/")` outside the app module (with two typos in the string).

```ts
const start = async () => {
  await connectDB();
  const server = app.listen(env.PORT, () => logger.info(`listening on :${env.PORT}`));

  const shutdown = (signal: string) => {
    logger.info({ signal }, "shutting down");
    server.close(() => { void mongoose.connection.close(false).then(() => process.exit(0)); });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
  process.on("unhandledRejection", (r) => logger.error({ err: r }, "unhandledRejection"));
  process.on("uncaughtException",  (e) => { logger.fatal({ err: e }, "uncaughtException"); process.exit(1); });
};
void start();
```

- [x] Also drop the `as string` cast at `db.ts:5` in favour of `env.MONGODB_URI`.

### 14. Convert all 21 controller functions

- [x] Wrap each in `asyncHandler` and `throw` instead of returning. Delete every
      `try/catch { return res.status(500) }`.
- [x] This removes the leaked handler names — `"Internal server error from addComment"` in
      `comment.controller.ts`, `"...from unlikeBlog"` in `like.controller.ts` — and the silent
      `catch {}` swallows at `comment.controller.ts:49,71,97` and all five in `admin.controller.ts`.
- [x] Add `isValidObjectId` guards on every `:id` / `:blogId` / `:userId` param. A malformed id
      currently produces a CastError → 500; it should be 400.
- [x] **Remove the four `$inc` counter writes now**, in the same pass that step 16 deletes the
      fields: `comment.controller.ts:27` and `:68` (`commentsCount`), `like.controller.ts:32` and
      `:59` (`likesCount`). Mongoose `strict` mode silently drops writes to paths that aren't in the
      schema, so leaving them until Phases 3 and 4 wouldn't crash — it would just leave four lines of
      code that look like they do something and don't. Delete them here so the codebase is coherent
      at the end of every phase.
- [x] **Dead-code sweep** while you're in there:
      [blog.controller.ts:6](../../server/src/controllers/blog.controller.ts#L6)
      `import { cursorTo } from "readline"`, line 7 the duplicate default import of Blog, the crammed
      double import on line 1, the three `console.log`s at lines 69/71/73 that fire on **every** list
      request, and every `console.log("Error:", error)`.

Mechanical example:

```ts
export const getBlogById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) throw badRequest("Invalid blog id");
  const blog = await Blog.findById(id).populate("author", "username profilePicture");
  if (!blog) throw notFound("Blog not found");
  res.json({ blog });
});
```

### 15. TypeScript and package config

- [x] `server/tsconfig.json` — remove the trailing comma after `exclude`, then add:
      ```jsonc
      "target": "ES2023", "lib": ["ES2023"],
      "noUncheckedIndexedAccess": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "forceConsistentCasingInFileNames": true,
      "declaration": false, "declarationMap": false   // build overhead for an app
      ```
- [x] `noUncheckedIndexedAccess` immediately flags
      [auth.middleware.ts:31](../../server/src/middleware/auth.middleware.ts#L31) —
      `authHeader.split(" ")[1]` is `string | undefined` and goes straight into `jwt.verify`. Fix:
      ```ts
      const token = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7).trim() : "";
      if (!token) throw unauthorized();
      ```
- [x] `server/package.json` — `"dev": "tsx watch src/index.ts"`, add `"typecheck": "tsc --noEmit"`,
      add `"engines": { "node": ">=22 <25" }`.
- [x] Delete `server/nodemon.json` — stale ts-node config that `npm run dev` already overrode.
      CLAUDE.md flags it as a known trap.
- [x] Add `server/.nvmrc` containing `24`.

### 16. Model hardening

No behavior change, so it's safe to do here.

- [x] **`user.ts`** — `email` gets `lowercase: true, trim: true` plus a format regex (today
      `A@x.com` and `a@x.com` are distinct accounts); `password` gets `select: false` (**and
      `loginUser` must then use `.select("+password")`**); `username` gets
      `trim, minlength: 3, maxlength: 32`.
- [x] **`blog.ts` / `comment.ts` / `like.ts`** — add the missing schema generics and interfaces (only
      `user.ts` has one today), plus `maxlength`: title 200, description 20000, comment 2000.
- [x] **Indexes** — only one exists in the whole codebase today:
      ```ts
      blogSchema.index({ createdAt: -1 });
      blogSchema.index({ author: 1, createdAt: -1 });
      commentSchema.index({ blog: 1, createdAt: -1 });
      commentSchema.index({ user: 1 });
      likeSchema.index({ user: 1 });
      userSchema.index({ role: 1 });
      ```
- [x] **Delete `commentsCount` and `likesCount` from `blog.ts`.** Written by four call sites, read by
      zero; no floor so they drift negative; cascade `deleteMany` never touches them. Phase 2's
      aggregation computes them authoritatively. The API response shape doesn't change, so the client
      `Blog` type keeps both fields. **Step 14 removes the four `$inc` writes in the same pass** —
      do not split those two edits across phases.

---

## Verification

```bash
cd server && npx tsc --noEmit && npm run build && npm start

curl -i localhost:5000/api/health                        # 200 {"status":"ok","db":"connected"}
curl -i localhost:5000/api/blogs/not-an-objectid         # 400, not 500
curl -i localhost:5000/api/nope                          # 404 JSON, not Express HTML
curl -i -H "Origin: https://evil.test" localhost:5000/api/blogs   # no Access-Control-Allow-Origin
curl -i -X POST -F "blogImage=@some.pdf" localhost:5000/api/blogs # 400 JSON, not HTML 500
```

- [x] Stop Mongo → `/api/health` returns **503**
- [x] Ctrl-C the server → `"shutting down"` log, clean exit 0
- [x] Click through every page of the existing client — **nothing should have changed**
