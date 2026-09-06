# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: a recruiter or hiring engineer evaluating the author's work.** They arrive cold from a
résumé link, a GitHub profile, or a shared post, spend roughly one to two minutes, and will not sign
up. They judge from the first viewport, the reading experience, and whatever evidence of craft is
visible without clicking into code.

**Secondary: a reader who followed a link to a single post.** No account, likely on a phone, there
for the writing and nothing else.

**Tertiary: the author.** Signed in, writes and edits posts, and is also the only admin — the
block-user and delete-any-content powers exist but are exercised by one person.

## Product Purpose

A blog people can read, and simultaneously the artifact that demonstrates the author's engineering
and design ability. Success is an evaluator forming a favourable judgment quickly, and a reader
finishing a post without friction. These are not in tension: the thing that convinces an evaluator
is that the reading experience is genuinely good.

## Positioning

Most MERN blog projects are CRUD demonstrations where the API trusts whatever the client sends. This
one enforces authorization server-side and can prove it — identity comes from a verified token, never
the request body, and the roadmap in `docs/plan/` documents that work as it lands. The credible claim
is rigour, not feature count.

## Operating Context

- **Evaluation scene:** cold visitor, no account, desktop or phone, 60–120 seconds, often arriving
  at `/` or directly at one post.
- **Reading scene:** a single post reached by link. Link previews and crawler-visible content matter
  because the post is the entry point, not the home page.
- **Authoring scene:** signed in, composing a post with a cover image, occasionally moderating.
- **Deployment reality:** the client and API are planned for two separate origins (Vercel + Render).
  Render's free tier spins down after idle, so a first request can take ~50 seconds. Perceived
  performance on a cold visit is a real design constraint, not a hypothetical one.

## Capabilities and Constraints

**Public:** browse posts, read a post, search, view an author's public profile (username, avatar,
join date only).

**Authenticated:** publish, edit and delete own posts; comment; like; edit own profile; delete own
account and all its content.

**Admin:** block/unblock users, delete any user or post. Created by a seed script — there is no
self-service admin signup, and the register endpoint strips any `role` field.

**Images:** users upload profile pictures and post cover images. Stored on local disk today; moving
to Cloudinary because the production host's filesystem is ephemeral.

**Technical constraints future design work must respect:**
- Next.js 16 App Router, React 19, Tailwind v4 in CSS-first mode — there is no `tailwind.config.*`.
- shadcn `base-nova` style on **Base UI, not Radix**: polymorphism is `render={<Link/>}`, never
  `asChild`, and there is no `<Form>` component (forms are `Field` + react-hook-form).
- The API is a separate Express origin, so the client cannot read an httpOnly auth cookie and
  edge middleware cannot verify the JWT.

**Explicitly undecided:** nothing outstanding.

## Brand Commitments

**The name is Marginalia** — the notes a reader writes in the margins. Confirmed by the author and
now binding: it is the wordmark, the page-title template (`%s · Marginalia`), the footer and the
`applicationName`. The placeholder "BlogApp" is retired and must not reappear.

The tagline is **"Notes in the margins."**

There is still no logo and no brand imagery: `client/public/` holds only the unmodified Next.js
starter SVGs, and none of them are in use. The visual identity is carried entirely by typography and
palette — see `DESIGN.md`.

## Evidence on Hand

- **Real posts with real uploaded cover images exist** in the database. Layouts should be designed
  against genuine article bodies and real cover art, not lorem ipsum.
- **No testimonials, user counts, press, customers, case studies, ratings or activity metrics exist,
  and none may be fabricated.** The app has no user base. Invented social proof on a portfolio piece
  is dishonest and trivially caught by the exact audience it is aimed at.
- `README.md` and the 15 files in `docs/plan/` document the engineering process and are themselves
  legitimate evidence of rigour.

## Product Principles

1. **The first viewport is the entire pitch.** An evaluator who leaves after 90 seconds must already
   have seen enough to judge favourably.
2. **Reading is the product.** Every element that is not the writing is subordinate to it.
3. **Claim nothing untrue.** No fabricated metrics, testimonials, or implied activity — ever.
4. **Craft shows where things break**, not where they succeed: empty states, cold starts, a
   200-character title, a missing cover image, a keyboard-only path.
5. **Design for the single-author reality**, not for the multi-author scale the schema permits.

## Accessibility & Inclusion

No externally imposed standard. The project has self-imposed one and already partially shipped it:
keyboard operability throughout, visible focus rings, and WCAG AA contrast in **both** light and dark
themes. Dark mode is a first-class requirement, not a toggle — six pages currently violate this and
are scheduled for repair.

---

*Visual system: [DESIGN.md](DESIGN.md). Command reference: [docs/ui/impeccable.md](docs/ui/impeccable.md).*
