# Phase 9 — Performance & data integrity

**Size:** S · **Coupling:** server only

**Goal:** every query is indexed, no accidental full scans, no drift.

← [8 — SEO](08-seo.md) · [Index](README.md) · Next: [10 — Deployment](10-deployment.md)

---

## Steps

### 1. Verify the indexes actually exist

- [ ] Check the deployed DB: `db.blogs.getIndexes()`, `db.comments.getIndexes()`, etc.
- [ ] Mongoose `autoIndex` is on by default in dev. Set `autoIndex: env.NODE_ENV !== "production"`
      and create production indexes deliberately via an `npm run indexes` script calling
      `Model.syncIndexes()`.

### 2. `explain("executionStats")` on the four hot paths

- [ ] Blog list **with** and **without** `q`
- [ ] Comments-by-blog
- [ ] Likes-by-blog
- [ ] Admin user search

Confirm `IXSCAN`, not `COLLSCAN`, and `totalDocsExamined ≈ nReturned`.

### 3. Cursor pagination for the feed (optional, good story)

`skip` degrades linearly — at page 50 Mongo walks 450 documents to return 9.

- [ ] Switch the infinite scroll to a `createdAt`-keyed cursor (`?after=<isoDate>`)
- [ ] Keep `?page=` for the admin tables, where jumping to a page number matters

> This is the difference between "knows about pagination" and "knows why skip is wrong".

### 4. `.lean()` on every read-only query

- [ ] The Phase 2 aggregation already returns POJOs, but `getBlogById`, `getCommentsByBlog` and the
      admin reads still hydrate full Mongoose documents and call `.toObject()`.

### 5. Projections, not exclusions

- [ ] Never `select("-password")` — it still returns email, role and `isBlocked`. Always allow-list
      the fields the endpoint actually needs.

### 6. Confirm compression isn't doubled

- [ ] `compression()` is already on from 0A. Check that Render's proxy isn't compressing again; if it
      is, drop the middleware.

### 7. Bundle audit

```bash
ANALYZE=true npm run build     # with @next/bundle-analyzer
```

- [ ] `date-fns` — import per-function, not the barrel
- [ ] `lucide-react` — tree-shakes correctly with named imports; **never** `import * as Icons`

---

## Verification

```
mongosh> db.blogs.aggregate([...pipeline...]).explain("executionStats")
```

- [ ] Time `GET /api/blogs?limit=9` before/after with `curl -w "%{time_total}\n"`. On a seeded
      500-blog dataset the pre-Phase-2 version issues 20 queries; the aggregation issues 1.
- [ ] Lighthouse Performance ≥ 90 on `/blogs`
