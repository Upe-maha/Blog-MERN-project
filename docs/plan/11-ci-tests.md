# Phase 11 — CI + a thin test suite

**Size:** M · **Coupling:** both

**Goal:** a green check on every push, and automated proof that the authorization rules hold.

← [10 — Deployment](10-deployment.md) · [Index](README.md)

---

## Dependencies

```bash
cd server && npm i -D vitest supertest @types/supertest mongodb-memory-server
```

> **Keep it narrow.** Don't chase coverage. Write ~20 integration tests over the 401/403/200 matrix —
> that's exactly the class of bug this whole plan is about, it's the part a reviewer will actually
> poke at, and it's the part that silently regresses when you refactor a router.

---

## Steps

### 1. `server/vitest.config.ts`

- [ ] Global setup that boots `mongodb-memory-server`, sets `process.env` for the zod schema in
      `env.ts`, and drops the DB between suites

> ⚠️ The in-memory server is a **standalone** by default, so the Phase 1/2/5 transactions will fail.
> Either start it as a one-node replica set (`MongoMemoryReplSet`) or make transactions opt-out under
> `NODE_ENV=test`.

> ⚠️ **The `.js` extensions will bite you here.** Vitest resolves through Vite, not Node, so
> `import { app } from "../app.js"` in a `.ts` test needs the resolver told about it. Either add
> `resolve: { extensions: [".ts", ".js"] }` plus a plugin that rewrites `.js` → `.ts`, or simply
> import without the extension **in test files only** and keep `.js` everywhere in `src/`. Don't
> "fix" the source imports to make tests pass — that breaks the production build.

### 2. `server/src/__tests__/auth.test.ts`

- [ ] Register rejects `role: "admin"` supplied in the body
- [ ] Login rate limit fires on the 11th attempt
- [ ] A blocked user gets 403
- [ ] A bad JWT gets 401

### 3. `server/src/__tests__/ownership.test.ts`

For each of `PUT /blogs/:id`, `DELETE /blogs/:id`, `PATCH /comments/:id`, `DELETE /comments/:id`,
`PATCH /users/me`:

- [ ] anonymous → **401**
- [ ] wrong user → **403**
- [ ] owner → **200**
- [ ] admin → **200**

### 4. `server/src/__tests__/validation.test.ts`

- [ ] `?limit=999999` clamps to 50
- [ ] `?page=-1` → 400
- [ ] Malformed ObjectId → 400
- [ ] Oversized title → 400

### 5. Wire up the scripts

- [ ] `"test": "vitest run"`, `"test:watch": "vitest"` in `server/package.json` — replacing the
      `exit 1` stub
- [ ] **Update `CLAUDE.md`.** It currently states there is no test framework and that `npm test` is
      the default failing stub. That stops being true here.

### 6. `.github/workflows/ci.yml`

Two jobs:

```yaml
server: npm ci → npx tsc --noEmit → npm test → npm run build
client: npm ci → npm run lint  → npx tsc --noEmit → npm run build
```

- [ ] `actions/setup-node@v4` with `node-version-file` pointing at `.nvmrc`
- [ ] npm caching

### 7. Optional

- [ ] `dependabot.yml`
- [ ] A Lighthouse CI job against a Vercel preview

---

## Verification

- [ ] `npm test` passes locally
- [ ] Push a branch, watch the Actions run go green
- [ ] **Then deliberately break it:** delete `requireOwnership` from one blog route and confirm CI
      turns red.

> That negative test is the whole point. A suite that has never failed hasn't proven anything.
