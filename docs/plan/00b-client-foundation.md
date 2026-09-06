# Phase 0B — Client foundation (design system)

> ✅ **Complete**, with three deviations from the plan as written — see "What actually happened"
> below. Build clean, typecheck clean, 10/10 routes render.

## What actually happened

**shadcn now uses Base UI, not Radix.** `shadcn@4.19.1` initialised the `base-nova` style, which
installs `@base-ui/react`. The accessibility guarantees the plan relied on (focus trap, Escape,
scroll lock on dialogs) are unchanged, but the API differs: **`render={<Component />}` replaces
Radix's `asChild`**. Later phases must use `render`.

**There is no `Form` component any more.** `base-nova/form.json` is an empty stub, which is why
`shadcn add form` succeeds while writing nothing. The replacement is **`field`** (installed).
Phase 1 builds forms with `Field` + react-hook-form directly, not `<Form>`.

**Token names are shadcn's, not the plan's.** `shadcn init` writes a full semantic palette and
every component is already wired to it, so inventing a parallel `--bg`/`--surface`/`--fg` set
would have meant two competing systems. Translate the plan's names:

| Plan | Actual |
|---|---|
| `--bg` / `bg-bg` | `--background` / `bg-background` |
| `--surface` | `--card` |
| `--surface-muted` | `--muted` |
| `--fg` | `--foreground` |
| `--fg-muted` | `--muted-foreground` |
| `--danger` | `--destructive` |
| `--border`, `--primary`, `--ring` | unchanged |

`--primary` was overridden from shadcn's neutral grey to indigo `oklch(0.545 0.19 264)`, and
`--ring` follows it so focus rings are visible.

> **Superseded.** The indigo primary and the neutral-grey palette were replaced wholesale by
> the Reading Room world — warm paper, warm ink, rust accent — recorded in
> [DESIGN.md](../../DESIGN.md). The token *names* in the table above are still correct; only
> their values changed. `--radius` also dropped from `0.625rem` to `4px`, and the broken
> self-referential `--font-sans: var(--font-sans)` written by `shadcn init` was fixed, which
> is why Geist was downloaded but never actually applied until now.

**Pulled forward from 0C:** the Footer rewrite, because its two `<a href>` internal links were
hard lint *errors*, not warnings.

**Known-red, owned by later phases:** `npm run lint` still reports 2 errors —
`register/page.tsx:94` (`catch (err: any)`, Phase 1 rewrites the file) and `blogs/page.tsx:34`
(setState in effect, Phase 2 rewrites the file).

**Size:** L · **Coupling:** none — the old pages still render, the chrome just looks different

**Goal:** tokens, `cn()`, primitives, icons, toasts, theme toggle and layout skeleton that all six
feature phases consume.

← [0A — Server foundation](00a-server-foundation.md) · [Index](README.md) · Next: [0C — Shell & home page](00c-shell-and-home.md)

---

## Dependencies

```bash
cd client
npx shadcn@latest init                 # writes components.json + lib/utils.ts, REWRITES globals.css
npx shadcn@latest add button input textarea label card avatar badge skeleton \
                       dialog alert-dialog dropdown-menu tabs sonner separator form
npm i lucide-react next-themes react-hook-form zod @hookform/resolvers date-fns
npm i -D @tailwindcss/typography
npm rm nodemon                          # stray devDep in a Next app
```

`shadcn add` pulls `@radix-ui/*`, `clsx`, `tailwind-merge`, `class-variance-authority` and `sonner`
transitively.

> ⚠️ **Ordering trap:** run `shadcn init` **first**, then layer the palette into `globals.css`. Init
> rewrites that file and will clobber hand-written tokens.

---

## Steps

### 1. Delete the dead UI layer

- [x] Delete `components/ui/Button.tsx`, `Input.tsx`, `Alert.tsx`, `Loading.tsx`. Usage counts are
      0 / 0 / 0 / 1, and the single `Loading` consumer is `AuthGuard.tsx`, which itself has **0**
      usages. shadcn's lowercase `button.tsx` / `input.tsx` replace them.
- [x] Update `components/ui/index.ts` and `components/index.ts` — both re-export the deleted files.

### 2. Delete the background photo

- [x] Delete `client/public/images/bg1.jpg` … `bg6.jpg` (~950 KB, five already unused).
- [x] Delete the `linear-gradient + url("/images/bg4.jpg")` + `background-attachment: fixed` block at
      [globals.css:25-38](../../client/app/globals.css).

### 3. Token palette in `client/app/globals.css`

Tailwind v4 is CSS-first, and class-based dark mode needs an explicit custom variant.

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-bg: var(--bg);              --color-surface: var(--surface);
  --color-surface-muted: var(--surface-muted);
  --color-border: var(--border);      --color-fg: var(--fg);
  --color-fg-muted: var(--fg-muted);  --color-primary: var(--primary);
  --color-primary-fg: var(--primary-fg);
  --color-danger: var(--danger);      --color-ring: var(--primary);

  --radius-card: 0.875rem;            --radius-control: 0.625rem;

  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
}

:root {
  --bg: oklch(0.985 0 0);             --surface: oklch(1 0 0);
  --surface-muted: oklch(0.968 0.002 250);
  --border: oklch(0.918 0.004 250);   --fg: oklch(0.21 0.012 255);
  --fg-muted: oklch(0.53 0.012 255);  --primary: oklch(0.545 0.19 264);
  --primary-fg: oklch(0.99 0 0);      --danger: oklch(0.58 0.21 25);
}
.dark {
  --bg: oklch(0.168 0.008 260);       --surface: oklch(0.212 0.010 260);
  --surface-muted: oklch(0.262 0.011 260);
  --border: oklch(0.312 0.012 260);   --fg: oklch(0.962 0.003 260);
  --fg-muted: oklch(0.715 0.010 260); --primary: oklch(0.685 0.155 264);
  --primary-fg: oklch(0.18 0.010 260);
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-bg text-fg antialiased; }
  :focus-visible { @apply outline-none ring-2 ring-ring ring-offset-2 ring-offset-bg; }
}
```

- [x] **Delete** the `input, textarea { color:#1f2937; background-color:#fff }` override at lines
      41-45 — a hardcoded light-mode rule that will fight dark mode on every single form field.
- [x] **Delete** the `@media (prefers-color-scheme: dark)` block at lines 17-22. `next-themes` with
      `attribute="class"` replaces it, and honoring the media query while zero `dark:` classes exist
      is exactly today's latent contrast bug.

### 4. `client/app/providers.tsx` (new, `"use client"`)

- [x] `ThemeProvider` with `attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange`
- [x] `<Toaster richColors closeButton position="bottom-right" />`
- [x] The `auth:unauthorized` / `auth:blocked` listeners from step 8

### 5. Strip `client/app/layout.tsx` to shell + providers

It currently applies `max-w-7xl mx-auto px-4` around `{children}` **and** every page re-applies its
own `max-w-7xl` / `max-w-6xl` / `max-w-3xl px-4` — doubling mobile gutters and making full-bleed
impossible.

```tsx
<html lang="en" suppressHydrationWarning>   {/* required by next-themes */}
  <body className={`${geistSans.variable} ${geistMono.variable}`}>
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2">
      Skip to content
    </a>
    <Providers>{children}</Providers>
  </body>
</html>
```

- [x] Add `display: "swap"` to both `next/font` calls (absent today)
- [x] Add `metadataBase` (Phase 8 builds on it)

### 6. Route-group layouts

`(auth)` and `(main)` have no `layout.tsx` at all today, so login and register render inside the full
Navbar + Footer chrome.

- [x] Move `Navbar` / `<main id="main">` / `Footer` into a new **`app/(main)/layout.tsx`**
- [x] New **`app/(auth)/layout.tsx`** — bare centered shell, small logo, theme toggle,
      `min-h-dvh grid place-items-center`
- [x] **Move `app/page.tsx` → `app/(main)/page.tsx`** so the home page keeps the navbar. The URL
      stays `/`. Move it only — its redesign is [Phase 0C](00c-shell-and-home.md), because it is a
      whole surface of its own and will look broken until the glass panels are rebuilt on tokens.
- [x] `app/not-found.tsx` and `app/error.tsx` sit outside both groups and will render bare — that's a
      reasonable "something broke" look; accept it.

### 7. Shared primitives — this is what kills the duplication

- [x] `components/ui/container.tsx` — `mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8`. One knob, and
      a page can opt out for full-bleed heroes.
- [x] `components/theme-toggle.tsx` — lucide `Sun`/`Moon`/`Monitor` in a shadcn `DropdownMenu`, with
      a `mounted` guard against hydration mismatch. Place it in `Navbar` and `(auth)/layout.tsx`.
- [x] `components/ui/page-header.tsx` — establishes the type scale that doesn't exist today (h1 is
      `text-5xl` / `7xl` / `4xl` / `3xl` / `2xl` / `9xl` depending on which page you open).

      | Role | Classes |
      |---|---|
      | h1 | `text-3xl sm:text-4xl font-semibold tracking-tight` |
      | h2 | `text-xl sm:text-2xl font-semibold` |
      | body | `text-base` |
      | meta | `text-sm text-fg-muted` |

- [x] `components/ui/empty-state.tsx` — lucide icon + title + description + CTA. Replaces five emoji
      blocks and admin's bare `<p>No users found.</p>`.
- [x] `components/ui/user-avatar.tsx` — shadcn `Avatar` + initials fallback. There are currently
      **six** hand-rolled copies of the "indigo circle with the first letter" pattern (BlogCard, blog
      detail, UserMenu, CommentSection ×2, EditProfileForm, admin ×2).
- [x] `components/ui/confirm-dialog.tsx` wrapping shadcn `AlertDialog` — replaces `confirm()` at
      `profile/page.tsx:44` and `CommentSection.tsx:66`, plus the hand-rolled modal at
      `admin/page.tsx:277` which has no `role="dialog"`, no focus trap, no Escape and no scroll lock.
      Radix gives you all four for free.
- [x] `components/skeletons/*` — replaces all **eight** copies of
      `w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin`.

### 8. Real interceptors in `client/lib/api.ts`

The response interceptor at lines 39-42 is a no-op today.

```ts
const apiClient = axios.create({ baseURL: API_URL, withCredentials: true, timeout: 15_000 });

apiClient.interceptors.response.use((r) => r, (error: AxiosError<{ message?: string }>) => {
  if (typeof window !== "undefined") {
    const status = error.response?.status;
    if (status === 401) window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    else if (status === 403 && error.response?.data?.message?.toLowerCase().includes("blocked"))
      window.dispatchEvent(new CustomEvent("auth:blocked", { detail: error.response.data.message }));
  }
  return Promise.reject(error);
});
```

> Dispatch an **event**, don't import `useAuthStore` here — `store → service → lib/api → store` is a
> circular import that will bite you in the Next bundler. The listener lives in `providers.tsx`:
> `logout()`, `toast.error(...)`, `router.replace('/login?next=' + encodeURIComponent(pathname))`.

### 9. `client/next.config.ts` — currently the empty stub

Configure images now so feature phases can use `next/image` from day one.

```ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http",  hostname: "localhost", port: "5000", pathname: "/uploads/**" },
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },   // Phase 7
      { protocol: "https", hostname: "**.onrender.com", pathname: "/uploads/**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  poweredByHeader: false,
  async headers() { /* X-Content-Type-Options, Referrer-Policy, Permissions-Policy */ },
};
```

### 10. Add the missing App Router files

- [x] `loading.tsx` for `(main)/blogs/`, `blogs/[id]/`, `profile/`, `admin/` using the new skeletons.
      There are **none anywhere** today, so there is no streaming UI at all.
- [x] `app/global-error.tsx` (missing)
- [x] Rewrite `app/error.tsx` with the new primitives

### 11. `AuthGuard.tsx` → `components/auth/require-auth.tsx`

- [x] Fix the stray `.js` extension at line 6 — `@/components/ui/Loading.js` on a `.tsx` module
- [x] **Wait for `isHydrated`** before deciding
- [x] Wire it into `(main)/profile/layout.tsx`, `(main)/blogs/create/layout.tsx`,
      `(main)/admin/layout.tsx`

> This single change fixes the hard-refresh bounce: `blogs/create` and `profile/edit` both check
> `isAuthenticated` without `isHydrated`, so a logged-in user refreshing either route is kicked to
> `/login`.

### 12. Cleanup

- [x] Delete `hooks/useBlogs.ts` — a pure passthrough of the store with zero consumers. Keep
      `hooks/useAuth.ts` only if Phase 1 routes login through it.
- [x] Fix `client/app/(auth)/login/page.tsx:21` — `React.SubmitEvent<HTMLFormElement>` is not a real
      React type and `tsc --noEmit` fails on it today. It's `React.FormEvent`.

---

## Verification

```bash
cd client && npx tsc --noEmit && npm run lint && npm run build && npm run dev
```

- [x] Toggle Sun / Moon / System — every surface flips, no white input boxes stuck on dark (that's
      the deleted `input,textarea` override)
- [x] `/login` renders with no navbar or footer, centered
- [x] Tab through the home page — every link and button shows a visible focus ring. **Currently zero
      elements have one**, across ~15 button-styled Links.
- [x] 375px viewport: gutters are 16px, not 32px (the double-container fix)
- [x] DevTools Network: `bg4.jpg` is gone
- [x] `grep -rn "indigo-600" client/app client/components` — should shrink every phase; target zero
      by Phase 6

> The home page, navbar and footer will look *worse* at the end of this phase than at the start: the
> photo is gone but the glass panels sized against it are still there. That is expected and it is
> what [Phase 0C](00c-shell-and-home.md) fixes. Don't stop here.
