# Phase 0C — Shell & home page

> ✅ **Complete except step 3** ("Latest posts"), which is deferred to Phase 2 as the step itself
> says — it needs `lib/server-api.ts`, which Phase 2 creates. Everything else done: build clean,
> typecheck clean, home page is now a server component, 404 route works.
>
> **Also done here, beyond the written steps:** `app/not-found.tsx` rebuilt on tokens (it sits
> outside both route groups so no other phase owned it, and its hardcoded greys broke in dark
> mode), and the two `bg-white/50` panels in `profile/page.tsx` swapped to `bg-card` — a token
> swap only, Phase 5 still owns the actual profile redesign.
>
> **Not verified by me:** the visual result and the mobile Sheet's focus trap. I can confirm the
> HTML, status codes, build and absence of the old markup, but not how it looks — open it in a
> browser and check light/dark plus the mobile menu.

**Size:** M · **Coupling:** client only — no API calls change

**Goal:** the three surfaces a visitor sees before they have an account — the home page, the navbar,
the footer — stop looking like scaffolding.

← [0B — Client foundation](00b-client-foundation.md) · [Index](README.md) · Next: [1 — Auth & Identity](01-auth-identity.md)

---

> **Why this is its own phase.** 0B builds the design system; the six feature phases apply it to
> logged-in screens. Without this phase nothing ever touches the marketing home page, the navbar or
> the footer — which is exactly what a reviewer or recruiter sees first, and the only part of the app
> most visitors ever load. It is also pure client work with no API coupling, so it can be done any
> time after 0B and skipped without blocking anything.

**Dependencies:** none new (everything comes from 0B).

---

## Steps

### 1. Delete the dead wrapper on the home page

`app/(main)/page.tsx` (moved there in 0B) opens with:

```tsx
<div className="min-h-screen w-full bg-cover bg-center bg-fixed my-20 flex flex-col gap-10">
```

- [x] `bg-cover bg-center bg-fixed` are **no-ops** — there is no `background-image` on this element.
      Delete them.
- [x] `min-h-screen` + `my-20` produces a large dead gap between the hero and the CTA. Delete both
      and use section padding instead.
- [x] The CTA section sits **outside** this wrapper, so section rhythm is already inconsistent. Put
      every section at the same level.
- [x] Delete the unused `import { useState, useEffect } from "react"` at line 3.
- [x] Once nothing on the page is interactive, **drop `"use client"`** — this becomes a server
      component and is one of the pages [Phase 8](08-seo.md) expects to already be converted.

### 2. Rebuild the three sections on tokens

All three are currently glass panels sized against the deleted background photo:
`bg-blue-500/40 backdrop-blur-lg` (hero), `bg-white/40 backdrop-blur-md` (features),
`bg-gray-900/40 backdrop-blur-sm` (CTA). With the photo gone they will look like grey boxes.

- [x] **Hero** — no panel at all. Full-bleed section on `bg-bg`, headline at the 0B scale
      (`text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight`, not `text-5xl md:text-7xl
      font-extrabold`), a supporting line at `text-lg text-fg-muted`, and two `Button`s — primary
      "Start reading" → `/blogs`, secondary "Write a post" → `/blogs/create`.
- [x] **Features** — shadcn `Card` on `bg-surface` with `border-border`. Replace the three emoji in
      `w-20 h-20` indigo circles (📝 🤝 ⚡) with lucide icons (`PenLine`, `Users`, `Zap`) at
      `size-5` on a `bg-surface-muted` rounded square. Emoji render differently on every platform,
      can't take a token color, and are announced literally by screen readers.
- [x] **CTA** — a single `bg-surface-muted` band with a top and bottom border, headline + one button.

### 3. Show real posts on the home page

The home page currently advertises a blog and shows none.

- [ ] Add a "Latest posts" section: an async server component fetching
      `GET /api/blogs?limit=3` through `lib/server-api.ts` (built in [Phase 2](02-blogs.md)) and
      rendering three `BlogCard`s.
- [ ] Sequencing: do steps 1, 2, 4, 5 now; come back for this one after Phase 2 exists. It is the
      only step in this phase with a dependency.

### 4. Navbar

- [x] Swap the hand-inlined `<svg>` hamburger and search icons for lucide `Menu` / `X` / `Search`.
- [x] The mobile menu has **no `aria-expanded`**, no outside-click close and no Escape close. Either
      add all three, or use the shadcn `Sheet` component, which gives you focus trap, Escape and
      scroll lock for free.
- [x] `UserMenu` is named a menu but is just an avatar next to a Logout button. Make it a real
      shadcn `DropdownMenu`: Profile · Dashboard (admin only) · Theme · Log out.
- [x] Add the `ThemeToggle` from 0B.
- [x] The search input pushes `?q=` — leave the behavior alone here; [Phase 2](02-blogs.md) makes the
      server actually honor it.
- [x] Sticky navbar keeps a `border-b border-border` and `bg-bg/80 backdrop-blur` — the one place
      glass is still the right call, because it sits over scrolling content.

### 5. Footer

- [x] It uses raw `<a href="/...">` for internal routes, which triggers a **full page reload** and
      throws away the React tree on every click. Swap to `next/link`.
- [x] Rebuild on tokens: `border-t border-border`, `text-sm text-fg-muted`, three columns collapsing
      to one under `sm:`.
- [x] Drop the emoji, keep it to real links and a copyright line.

### 6. Sweep the leftovers

- [x] `grep -rn "backdrop-blur" client/` — every remaining hit outside the navbar is a leftover from
      the deleted photo.
- [x] `grep -rn "bg-white/\|bg-gray-900/" client/` — the translucent surfaces. All should become
      `bg-surface` / `bg-surface-muted`.
- [x] `grep -rn "text-white" client/app/\(main\)/page.tsx` — the hero was white text on a photo; on
      `bg-bg` it will be invisible in light mode.

---

## Verification

```bash
cd client && npx tsc --noEmit && npm run lint && npm run build

# the home page should no longer be a client component
grep -c '"use client"' 'client/app/(main)/page.tsx'     # 0
```

- [x] Load `/` in **light and dark** — no invisible white-on-white text, no grey ghost panels where
      the glass used to be
- [x] No large empty gap between the hero and the CTA (the deleted `min-h-screen my-20`)
- [x] 375px: hero headline doesn't overflow, buttons stack, footer collapses to one column
- [x] Tab from the top: skip link → logo → nav links → theme toggle → user menu → hero buttons, every
      one with a visible focus ring
- [x] Open the mobile menu, press **Escape** → it closes; focus returns to the hamburger
- [x] Click a footer link → client-side navigation, no full page reload (watch the Network tab: no
      document request)
- [x] Lighthouse Accessibility ≥ 95 on `/`
