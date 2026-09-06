# Phase 8 — SEO & remaining server components

**Size:** M · **Coupling:** client only

**Goal:** every page is indexable, shareable, and has a correct title.

← [7 — Cloudinary](07-cloudinary.md) · [Index](README.md) · Next: [9 — Performance](09-performance.md)

---

## Steps

### 1. A real default metadata object

`app/layout.tsx` currently holds the **only** metadata export in the entire app, and it's four lines.

```ts
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? `https://${process.env.VERCEL_URL}`),
  title: { default: "BlogApp", template: "%s · BlogApp" },
  description: "...",
  applicationName: "BlogApp",
  openGraph: { /* ... */ },
  twitter: { /* ... */ },
  robots: { /* ... */ },
};
```

### 2. `generateMetadata` on the remaining dynamic routes

- [ ] `/users/[id]` from [Phase 5](05-profile.md). `/blogs/[id]` got it in [Phase 2](02-blogs.md).

### 3. Static metadata on the fixed routes

- [ ] `/`, `/blogs`, `/login`, `/register` — with `robots: { index: false }` on login and register

### 4. `app/sitemap.ts` (new)

- [ ] Static routes + every blog with `lastModified: blog.updatedAt`
- [ ] Fetch via `lib/server-api.ts` with a high `limit`, or add a dedicated lightweight
      `GET /api/blogs/sitemap` returning just `{_id, updatedAt}`

### 5. `app/robots.ts` (new)

- [ ] Allow all, disallow `/admin`, `/profile`, `/api`, point at the sitemap

### 6. Dynamic OG images

- [ ] `app/opengraph-image.tsx` and `app/(main)/blogs/[id]/opengraph-image.tsx` via `next/og`
      `ImageResponse` — 1200×630, title + author on a token-colored background
- [ ] This is what makes shared links look intentional rather than generic

### 7. JSON-LD

- [ ] A `BlogPosting` script tag on `/blogs/[id]` with `headline`, `datePublished`, `dateModified`,
      `author`, `image`, `mainEntityOfPage`. Render it from the server component.

### 8. Convert the last client pages

After Phases 2, 5 and 8 the remaining `"use client"` pages should be only `/login`, `/register`,
`/profile/edit`, `/admin` — all genuinely interactive.

- [ ] Verify: `grep -rln '"use client"' client/app` — starts at **8 of 8 pages**

### 9. Icons and manifest

- [ ] `app/manifest.ts`, proper `icon.png` / `apple-icon.png` (currently just `favicon.ico`)

---

## Verification

```bash
cd client && npm run build
# check the route table: / and /blogs should be ○ Static or ƒ Dynamic-with-cache, not client-only

curl -s localhost:3000/sitemap.xml | head
curl -s localhost:3000/robots.txt
curl -s localhost:3000/blogs/$ID | grep -E 'og:(title|image|description)|application/ld\+json'
```

- [ ] Paste a blog URL into the Slack / Discord / Twitter card validator → title, description and
      image are **the post's**, not the site default
- [ ] Lighthouse SEO ≥ 95
- [ ] Lighthouse CLS near zero — now that `next/image` supplies dimensions. 15 raw `<img>` with none
      is where the current layout shift came from.
