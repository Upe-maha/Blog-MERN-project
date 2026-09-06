# Phase 10 — Deployment

**Size:** M · **Coupling:** both

**Goal:** two live URLs, correct env in both, previews that work.

← [9 — Performance](09-performance.md) · [Index](README.md) · Next: [11 — CI + tests](11-ci-tests.md)

---

> ⚠️ **[Phase 7](07-cloudinary.md) must be done first.** Render's disk is ephemeral; without
> Cloudinary every image dies on the next redeploy.

---

## Server → Render

| Setting | Value |
|---|---|
| Root Directory | `server` |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm start` |
| **Health Check Path** | `/api/health` |
| Node version | from `engines` in `package.json` + `.nvmrc` (both added in 0A) |

> Render polls the health check. Phase 0A made it honest, so a Mongo outage now marks the instance
> unhealthy instead of green-lighting a broken deploy.

### Environment variables

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | *leave unset — Render injects it; `env.PORT` reads it* |
| `MONGODB_URI` | Atlas SRV string |
| `JWT_SECRET` | 48 random bytes, base64url |
| `JWT_EXPIRES_IN` | `7d` |
| `CLIENT_URL` | `https://<your-app>.vercel.app` |
| `CORS_ORIGINS` | custom domain, comma-separated |
| `ALLOW_VERCEL_PREVIEWS` | `true` |
| `LOG_LEVEL` | `info` |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | from Cloudinary |
| `CLOUDINARY_FOLDER` | `blog-mern` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | for `npm run seed:admin` |

### Notes

- [ ] Optionally commit `server/render.yaml` as a blueprint, so the config is reviewable
- [ ] **Atlas:** allow `0.0.0.0/0` (Render free has no static egress IP) with a strong DB password,
      or pay for a static outbound IP
- [ ] **Free-tier caveat:** the instance spins down after 15 min idle and the first request afterward
      takes ~50 s. **Put this in the README** so a reviewer doesn't think the app is broken.
- [ ] **Railway alternative:** Root Directory `server`, Nixpacks auto-detects Node from `engines`,
      Start Command `npm start`, generate a public domain, identical env vars. No spin-down on the
      hobby plan, but it isn't free.

---

## Client → Vercel

Root Directory `client`. Framework preset auto-detected; leave build and install commands default.

| Key | Scope | Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | all | `https://<api>.onrender.com/api` |
| `NEXT_PUBLIC_BASE_URL` | all | `https://<api>.onrender.com` |
| `API_URL` | all | same as `NEXT_PUBLIC_API_URL` — used by `lib/server-api.ts` server-side |
| `NEXT_PUBLIC_SITE_URL` | production | `https://<your-app>.vercel.app` or custom domain |

- `metadataBase` falls back to `VERCEL_URL` on previews so OG tags aren't broken there
- `images.remotePatterns` already covers `res.cloudinary.com` from 0B

---

## Steps

1. - [ ] Deploy the server first; confirm `/api/health` returns 200
2. - [ ] Create the first admin.

   > ⚠️ **Render's Shell is a paid feature — free instances don't have it.** So run the seed script
   > from your own machine against the production database instead:
   > ```bash
   > cd server
   > MONGODB_URI="<the Atlas SRV string>" ADMIN_EMAIL="you@example.com" \
   >   ADMIN_PASSWORD="<a strong one>" npm run seed:admin
   > ```
   > Your IP must be allowed in Atlas (it already is if you set `0.0.0.0/0` above). The script is
   > idempotent, so running it twice is safe. On Railway, `railway run npm run seed:admin` works on
   > every tier.
3. - [ ] Deploy the client with the real API URL
4. - [ ] Set `CLIENT_URL` on the server to the actual Vercel domain and redeploy

   > A `403 Origin not allowed` in the browser console means this step was skipped — Phase 0A's
   > allow-list rejects anything not listed.

5. - [ ] Smoke-test the full flow on production: register → login → create with image → like →
     comment → edit → delete → admin
6. - [ ] **README rewrite** — architecture diagram, both env tables, local setup, deploy steps, the
     free-tier cold-start note, and a "what I'd do next" section.

   > For a portfolio project this file does more work than any single phase.

7. - [ ] Document the auth model (Bearer JWT, server-side ownership, admin via seed script) in a
     `SECURITY.md` or a README section

---

## Verification

```bash
curl -s https://<api>.onrender.com/api/health | jq
curl -i -H "Origin: https://evil.test" https://<api>.onrender.com/api/blogs        # no CORS header
curl -i -H "Origin: https://<app>.vercel.app" https://<api>.onrender.com/api/blogs # allowed
curl -sI https://<api>.onrender.com/api/blogs | grep -i 'x-frame-options\|strict-transport\|x-content-type'
```

- [ ] Run Lighthouse against the production URL
- [ ] Open the app on a real phone
- [ ] Check Render logs for structured pino JSON, not `console.log`
- [ ] **Deploy twice in a row and confirm images survive** — that's the Phase 7 payoff
