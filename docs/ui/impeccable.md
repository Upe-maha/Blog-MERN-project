# Impeccable — UI/UX commands for Marginalia

Impeccable is a **design skill pack for the AI agent**, not a component library. Installing it adds
no React components and no CSS. What it adds is a shared vocabulary — 23 commands — plus a detector
that scans for anti-patterns, all of it enforcing the contract in
[DESIGN.md](../../DESIGN.md) and the product truth in [PRODUCT.md](../../PRODUCT.md).

If you are looking for what the interface should *look* like, read `DESIGN.md`. This file is about
how to drive the tool.

---

## Install

Already installed on this machine, globally, for Claude Code:

```bash
npx impeccable install         # interactive: choose harnesses + project|global scope
npx impeccable update          # pull the latest skills
npx impeccable check           # is an update available?
```

Claude Code can alternatively install it as a plugin:

```
/plugin marketplace add pbakaus/impeccable
```

Requires Node `>=22.18.0`. Installed here at **3.6.1**, Apache-2.0.

> ⚠️ `npx impeccable install --help` is **not** a help flag — the installer runs immediately and,
> with no TTY, silently accepts its defaults (all detected harnesses, global scope). Use
> `npx impeccable --help` for the top-level command list instead.

---

## The 23 commands

Invoked in the agent chat — never in a terminal — as `/impeccable <command> [target]`.

### Build — establish context and make new things

| Command | What it does |
|---|---|
| `init` | Interview for durable product truth, write `PRODUCT.md`. One-time. Aliased as `teach`. |
| `document` | Read the code and write `DESIGN.md` + `.impeccable/design.json`. Re-run when the design drifts. |
| `shape` | Plan UX/UI **before** any code is written. The right entry point for a new surface. |
| `extract` | Pull recurring tokens and components out of a surface and into the design system. |
| `craft` | Deprecated alias for ordinary new work — prefer `shape`. |

### Evaluate — find out what is wrong

| Command | What it does |
|---|---|
| `critique` | UX review with heuristic scoring: hierarchy, clarity, cognitive load, emotional resonance. |
| `audit` | Technical quality: accessibility, performance, responsive behaviour. |

### Refine — improve what exists

| Command | What it does |
|---|---|
| `polish` | Final pass before shipping: design-system alignment and loose ends. |
| `bolder` | Amplify a design that is safe or bland. |
| `quieter` | Tone down a design that is shouting. |
| `distill` | Strip to essence; remove complexity. |
| `harden` | Production reality: errors, i18n, text overflow, edge cases. |
| `onboard` | First-run flows, empty states, activation paths. |

### Enhance — add a specific quality

| Command | What it does |
|---|---|
| `typeset` | Typography hierarchy, font choice, sizing. |
| `layout` | Spacing, rhythm, alignment, visual hierarchy. |
| `colorize` | Introduce strategic colour into a monochrome UI. |
| `animate` | Purposeful motion. |
| `delight` | Personality and memorable touches. |
| `overdrive` | Push past conventional limits. Use sparingly. |

### Fix — correct a specific defect

| Command | What it does |
|---|---|
| `clarify` | UX copy, labels, error messages. |
| `adapt` | Adapt for other devices and screen sizes. |
| `optimize` | Diagnose and fix UI performance. |

### Iterate

| Command | What it does |
|---|---|
| `live` | Visual variant mode — select elements in the browser and generate alternatives. Not adopted in this project. |

### Meta (not part of the 23)

| Command | What it does |
|---|---|
| `/impeccable hooks <on\|off\|status>` | The design detector hook. **On** in this project. |
| `/impeccable doctor` | Report and repair drift between the Impeccable artifacts and the installed version. |
| `node <skill>/scripts/pin.mjs pin audit` | Create a standalone `/audit` shortcut. |

---

## The loop for this repo

For any surface, in order:

```
/impeccable shape <surface>      # only for new surfaces — plan before code
/impeccable critique <surface>   # what is wrong with it as UX
/impeccable audit <surface>      # a11y, responsive, performance
/impeccable polish <surface>     # align to DESIGN.md and ship
```

`typeset`, `layout`, `clarify` and `harden` are the targeted follow-ups when `critique` names a
specific problem. Don't run all 23 — run what the critique asked for.

### Who owns which surface

The visual work is split across the roadmap in [docs/plan/](../plan/README.md). Point commands at a
surface only when its phase is the one you are doing, or you will do work the owning phase discards.

| Surface | Files | Owner | State |
|---|---|---|---|
| Home | `app/(main)/page.tsx` | — | **Done.** Reading Room. |
| Login / Register / auth shell | `app/(auth)/` | — | **Done.** |
| Navbar / Footer | `components/layout/` | — | **Done.** |
| 404 / error | `app/not-found.tsx`, `app/error.tsx` | — | **Done.** |
| Blog list, detail, create | `app/(main)/blogs/**` | — | **Done.** Ruled rows, server-rendered. |
| Comments | `components/blog/CommentSection.tsx` | — | **Done.** Ruled thread, inline edit. |
| Likes | `components/blog/LikeSection.tsx` | — | **Done.** lucide heart, `aria-pressed`. |
| Profile | `app/(main)/profile/**`, `components/user/` | — | **Done.** Ruled header, real stats. |
| Public author page | `app/(main)/users/[id]/` | — | **Done.** Server component. |
| Admin | `app/(main)/admin/**` | — | **Done.** Ruled tables, card fallback below `md`. |

Every surface has now been designed. Anything added from here starts from `DESIGN.md` rather than
inheriting a legacy layout.

---

## The detector

Runs automatically. `.claude/settings.local.json` wires it to fire after every `Edit`/`Write` on a UI
file, with a full-rule deep pass when the agent stops. 61 rules covering AI-generated tells (purple
gradients, side-tab borders, bounce easing, dark glows), accessibility failures, and general quality
(line length, cramped padding, small touch targets, skipped headings).

Run it by hand:

```bash
npx impeccable detect client/app client/components   # scan paths
npx impeccable detect http://localhost:3000          # scan the running app — best results
npx impeccable detect --json .                       # machine-readable
npx impeccable ignores list                          # current suppressions
```

Suppress with `npx impeccable ignores add-value <rule> <value> --reason "..."`, or inline with
`{/* impeccable-disable-next-line <rule>: reason */}`.

> The hook only fires on the agent's `Edit`/`Write` tools. Changes made with `sed`, a heredoc or any
> shell command bypass it — run `detect` by hand after a scripted edit.

---

## Conventions Impeccable must respect here

Generated code that ignores these will not compile or will not match the system:

- **Base UI, not Radix.** Polymorphism is `render={<Link href="/x" />}`, **never** `asChild`.
- **There is no `<Form>` component.** `base-nova/form.json` is an empty stub. Forms are `Field` +
  react-hook-form + `zodResolver`.
- **Semantic tokens only.** `bg-primary`, `text-muted-foreground`, `border-border`. Never
  `indigo-600` or `gray-700` — all 230 such occurrences were removed and must not come back.
- **`Container` owns page width.** It is already applied in `app/(main)/layout.tsx`; a page that adds
  its own `max-w-*` double-pads on mobile. Inside it, use `max-w-reading` (42rem) for prose and
  `max-w-feed` (48rem) for lists.
- **Tailwind v4, CSS-first.** There is no `tailwind.config.*`. Tokens live in `app/globals.css`.
- **No shadows.** The system has no shadow vocabulary — see The Flat Rule in `DESIGN.md`.
- **Never fabricate evidence.** `PRODUCT.md` records that there are no users, testimonials or
  metrics. Copy like "join a growing community" is a factual error, not a style choice.

---

## File roles

| File | Committed | What it holds |
|---|---|---|
| `PRODUCT.md` | yes | Durable product truth: users, purpose, constraints, evidence. No visual content. |
| `DESIGN.md` | yes | The visual contract: tokens in frontmatter (normative), prose for how to apply them. |
| `.impeccable/design.json` | yes | Sidecar for what the frontmatter schema can't hold — tonal ramps, motion, breakpoints, component snippets, the narrative rules. |
| `.impeccable/config.json` | yes | Shared detector settings and ignores. |
| `.impeccable/config.local.json` | no | Per-developer overrides and hook consent. |
| `.impeccable/surfaces/*.md` | yes | Per-route strategy, written by `shape`. |
| `.claude/settings.local.json` | no | The hook wiring. Machine-local by design. |

Regenerate `DESIGN.md` and its sidecar together — `/impeccable document` writes both.
