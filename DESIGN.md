---
name: Marginalia
description: The Reading Room — a warm, paper-and-ink editorial system where rules and air replace boxes, and the writing is the only thing asking for attention.
colors:
  paper: "oklch(0.980 0.008 80)"
  paper-raised: "oklch(0.995 0.004 85)"
  paper-sunken: "oklch(0.955 0.009 78)"
  ink: "oklch(0.240 0.015 45)"
  ink-muted: "oklch(0.520 0.015 50)"
  rule: "oklch(0.900 0.010 75)"
  rust: "oklch(0.520 0.140 40)"
  rust-deep: "oklch(0.440 0.145 38)"
  alarm: "oklch(0.550 0.210 18)"
  night: "oklch(0.190 0.008 60)"
  night-raised: "oklch(0.220 0.009 60)"
  night-sunken: "oklch(0.240 0.010 60)"
  night-ink: "oklch(0.920 0.008 80)"
  night-ink-muted: "oklch(0.680 0.012 70)"
  night-rule: "oklch(0.300 0.010 60)"
  night-rust: "oklch(0.680 0.130 42)"
  night-alarm: "oklch(0.650 0.180 22)"
typography:
  display:
    fontFamily: "Fraunces, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2.5rem, 6vw, 4rem)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.02em"
    fontVariation: "'opsz' 144, 'SOFT' 0, 'WONK' 1"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.015em"
    fontVariation: "'opsz' 72, 'WONK' 0"
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "normal"
    fontVariation: "'opsz' 14, 'WONK' 0"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
  meta:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.06em"
rounded:
  none: "0px"
  sm: "2px"
  md: "4px"
  lg: "6px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  "2xl": "64px"
  "3xl": "96px"
components:
  button-primary:
    backgroundColor: "{colors.rust}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.rust-deep}"
    textColor: "{colors.paper}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  button-ghost-hover:
    backgroundColor: "{colors.paper-sunken}"
    textColor: "{colors.ink}"
  input-default:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    height: "40px"
  post-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "24px 0"
  tag:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.meta}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
layout:
  prose: "42rem"
  index: "48rem"
  page: "72rem"
  proseMeasure: "68ch"
  navHeight: "64px"
  gutters:
    base: "16px"
    sm: "24px"
    lg: "32px"
motion:
  fast: "150ms"
  standard: "200ms"
  easing: "ease-out"
focus:
  ring: "2px"
  offset: "2px"
  color: rust
breakpoints:
  sm: "640px"
  md: "768px"
  lg: "1024px"
  xl: "1280px"
touchTarget:
  min: "44px"
control:
  height: "40px"
  heightSmall: "32px"
---

# Marginalia

**Version:** 1.0
**Design language:** The Reading Room
**Status:** Production
**Primary medium:** Editorial web application
**Visual character:** Warm, literary, quiet, tactile, restrained

---

# 1. Design Philosophy

## Creative North Star — "The Reading Room"

A reading room is quiet on purpose.

The furniture is good, but it does not introduce itself. The light is warm. The surfaces are calm. Nothing blinks. Nothing competes with the book.

Marginalia follows the same principle.

The interface exists to make reading, writing, and navigating content feel effortless. Chrome recedes to the edges. Metadata whispers. Controls are clear but never theatrical. The warm accent appears rarely enough that its appearance carries meaning.

The visual material is **paper and ink**, not glass and plastic.

The system therefore favors:

* warm paper tones over white
* warm near-black ink over black
* serif typography for reading
* sans-serif typography for operation
* hairline rules instead of cards
* whitespace instead of decoration
* tonal depth instead of shadows
* restrained motion instead of animation
* one accent color instead of a palette of competing accents

The interface should feel closer to a **well-designed literary journal** than a SaaS dashboard.

---

# 2. Core Principles

These principles take precedence over individual component styling.

## 2.1 The Writing Is the Product

Content has visual priority over interface chrome.

When forced to choose between:

* stronger UI treatment
* more whitespace
* stronger typography
* more decoration

prefer:

**whitespace → typography → hierarchy → decoration**

Decoration is the final tool, not the first.

---

## 2.2 Space Before Structure

When a layout feels crowded or unresolved, increase space before adding:

* borders
* backgrounds
* cards
* icons
* shadows
* decorative elements

The first question should always be:

> "Does this need more room?"

---

## 2.3 Rules Before Boxes

The default structural primitive is a **1px hairline rule**.

Use a rule before using:

* a card
* a bordered container
* a background panel
* a shadow

A container should exist because it provides a meaningful surface, not because every piece of content needs a box.

---

## 2.4 Flat at Rest

The interface has no shadow vocabulary.

There are no:

* `box-shadow`
* drop shadows
* glow effects
* elevation shadows
* floating cards

Depth comes from:

1. space
2. rules
3. tonal surface changes

The sole exception is the keyboard focus indicator.

---

## 2.5 One Voice

Rust is the system's only accent.

Rust communicates:

**act / active / navigate**

Alarm communicates:

**danger / destructive / error**

They must never be interchangeable.

Rust should normally occupy **less than 10% of the visible interface area**.

If multiple elements compete for rust, reconsider the hierarchy.

---

## 2.6 The Serif Reads, the Sans Operates

If a person reads the content for meaning:

**Fraunces**

If a person operates the interface:

**Geist**

Therefore:

| Purpose       | Typeface |
| ------------- | -------- |
| Article body  | Fraunces |
| Article title | Fraunces |
| Page heading  | Fraunces |
| Post title    | Fraunces |
| Excerpt       | Fraunces |
| Button        | Geist    |
| Navigation    | Geist    |
| Form label    | Geist    |
| Metadata      | Geist    |
| Table header  | Geist    |
| Status label  | Geist    |

A serif button is incorrect.

A sans-serif article paragraph is incorrect.

---

# 3. Design Tokens

## 3.1 Color

### Light Theme

```yaml
colors:
  paper: "oklch(0.980 0.008 80)"
  paper-raised: "oklch(0.995 0.004 85)"
  paper-sunken: "oklch(0.955 0.009 78)"

  ink: "oklch(0.240 0.015 45)"
  ink-muted: "oklch(0.520 0.015 50)"

  rule: "oklch(0.900 0.010 75)"

  rust: "oklch(0.520 0.140 40)"
  rust-deep: "oklch(0.440 0.145 38)"

  alarm: "oklch(0.550 0.210 18)"
```

### Dark Theme

```yaml
colors:
  night: "oklch(0.190 0.008 60)"
  night-raised: "oklch(0.220 0.009 60)"
  night-sunken: "oklch(0.240 0.010 60)"

  night-ink: "oklch(0.920 0.008 80)"
  night-ink-muted: "oklch(0.680 0.012 70)"

  night-rule: "oklch(0.300 0.010 60)"

  night-rust: "oklch(0.680 0.130 42)"
  night-alarm: "oklch(0.650 0.180 22)"
```

---

## 3.2 Semantic Color Tokens

Components should consume semantic tokens rather than hard-coded color values.

```yaml
semantic:
  background:
    default: paper
    raised: paper-raised
    sunken: paper-sunken

  foreground:
    default: ink
    muted: ink-muted

  border:
    default: rule

  action:
    default: rust
    hover: rust-deep

  destructive:
    default: alarm

  focus:
    ring: rust
```

Dark mode maps these semantic tokens to the corresponding `night-*` values.

---

# 4. Absolute Color Rules

## The No Pure Values Rule

Never use:

```text
#000
#000000
#fff
#ffffff
```

Never introduce a neutral grey with zero chroma.

Every neutral should retain a warm hue.

A pure neutral is considered a design-system defect unless required by an external media asset.

---

## The Rust Is Not Alarm Rule

Rust means:

> Act.

Alarm means:

> Destroy / invalid / danger.

Examples:

| Situation                | Color |
| ------------------------ | ----- |
| Primary CTA              | Rust  |
| Active navigation        | Rust  |
| Inline link              | Rust  |
| Focus ring               | Rust  |
| Delete                   | Alarm |
| Validation error         | Alarm |
| Destructive confirmation | Alarm |

---

# 5. Typography

## 5.1 Font Families

### Display / Reading

```css
Fraunces, Georgia, "Times New Roman", serif
```

### Interface

```css
Geist, ui-sans-serif, system-ui, sans-serif
```

Fraunces is the primary editorial voice.

Geist is the operational voice.

---

# 6. Type Scale

## Display

```yaml
font-family: "Fraunces, Georgia, 'Times New Roman', serif"
font-size: "clamp(2.5rem, 6vw, 4rem)"
font-weight: 400
line-height: 1.05
letter-spacing: "-0.02em"
font-variation-settings: "'opsz' 144, 'WONK' 1"
```

**Usage:** Home hero only.

Maximum:

**one display heading per page.**

> **Implementation note.** `SOFT` is deliberately absent from the loaded variable font. It is only
> ever set to its default of `0`, so rendering is identical, and every unused axis is weight in a
> font file that sits directly on the LCP path. See §52.

---

## Headline

```yaml
font-family: "Fraunces, Georgia, serif"
font-size: "clamp(1.75rem, 3.5vw, 2.5rem)"
font-weight: 400
line-height: 1.15
letter-spacing: "-0.015em"
font-variation-settings: "'opsz' 72, 'WONK' 0"
```

**Usage:**

* page titles
* article titles
* major headings

---

## Title

```yaml
font-family: "Fraunces, Georgia, serif"
font-size: "1.25rem"
font-weight: 500
line-height: 1.3
letter-spacing: "-0.01em"
```

**Usage:**

* post rows
* section titles
* dialog titles
* secondary headings

---

## Body

```yaml
font-family: "Fraunces, Georgia, serif"
font-size: "1.125rem"
font-weight: 400
line-height: 1.7
letter-spacing: normal
font-variation-settings: "'opsz' 14, 'WONK' 0"
```

Continuous reading text must never be smaller than:

**18px**

---

## Label

```yaml
font-family: "Geist, ui-sans-serif, system-ui, sans-serif"
font-size: "0.875rem"
font-weight: 500
line-height: 1.4
letter-spacing: "0.01em"
```

Usage:

* buttons
* navigation
* form labels
* controls

---

## Meta

```yaml
font-family: "Geist, ui-sans-serif, system-ui, sans-serif"
font-size: "0.8125rem"
font-weight: 400
line-height: 1.4
letter-spacing: "0.06em"
```

Usage:

* dates
* bylines
* reading time
* tags
* table headers
* secondary metadata

Uppercase may be used sparingly.

Do not uppercase long prose.

---

# 7. Typography Rules

## The 68 Character Rule

Continuous prose must never exceed:

**68ch**

The prose column should therefore use:

```css
max-width: 42rem;
```

Wide screens receive more surrounding whitespace, not longer lines.

---

## The One Display Rule

Display typography appears:

**once per page maximum.**

A second display heading weakens the hierarchy.

---

## The Reading Floor

Anything intended for continuous reading must be:

**18px or larger.**

This includes:

* article text
* long-form notes
* editorial content
* sustained descriptions

---

# 8. Layout

## 8.1 Layout Containers

There are three canonical widths.

### Prose

```css
max-width: 42rem;
```

Approximately 68ch at the base body size.

Use for:

* articles
* notes
* long-form content
* sustained reading
* forms where readability matters

---

### Index

```css
max-width: 48rem;
```

Use for:

* post indexes
* search results
* feeds
* content archives

The index is wider because rows contain multiple information layers.

---

### Page

```css
max-width: 72rem;
```

The page container is the application's maximum structural width.

Pages must not independently redefine their own page-level max-width.

The layout `Container` owns page width.

---

# 9. Container Gutters

```text
base: 16px
sm:   24px
lg:   32px
```

The container owns horizontal padding.

Individual pages should not compensate with arbitrary negative margins or custom horizontal gutters unless explicitly required by a component specification.

---

# 10. Spacing

The system uses a 4px base unit.

```yaml
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  2xl: "64px"
  3xl: "96px"
```

Use these values whenever possible.

Avoid arbitrary values such as:

```text
13px
19px
27px
31px
47px
```

unless a component has a documented optical reason.

---

# 11. Vertical Rhythm

### Within a component

Use:

**4 / 8 / 16 / 24px**

### Between related groups

Use:

**24 / 40px**

### Between major sections

Use:

**64px**

### Home page major sections

Use:

**96px**

Whitespace is part of the visual identity.

---

# 12. Responsive Design

Use the standard breakpoints:

```text
sm  640px
md  768px
lg  1024px
xl  1280px
```

Responsive behavior should be structural rather than decorative.

---

## Below `md`

Navigation collapses.

Metadata stacks.

Post rows may simplify their image treatment.

Controls should remain comfortably touchable.

---

## Touch Target

Interactive controls should provide a minimum effective target of approximately:

**44 × 44px**

Even when the visible glyph or label is smaller.

Do not make the interface visually oversized merely to achieve this; use internal hit areas where appropriate.

---

# 13. Navigation

The navigation is intentionally quiet.

```yaml
height: "64px"
background: paper
border-bottom: "1px solid rule"
```

The navigation may use a **subtle backdrop blur** only to preserve legibility over scrolling content.

This is not a glassmorphism treatment.

It must never introduce:

* translucent decorative panels
* gradients
* glowing surfaces
* shadow
* floating glass cards

The navigation should visually remain part of the paper surface.

---

## Navigation States

### Default

`Ink Muted`

### Hover

`Ink`

### Active

`Rust`

### Focus

`Rust` focus ring

Active state should never depend solely on color.

Where appropriate, reinforce active navigation with:

* an underline
* a small rule
* stronger weight

but never multiple decorative indicators simultaneously.

---

# 14. Buttons

## Primary

```yaml
background: rust
color: paper
radius: 4px
height: 40px
padding: 10px 20px
font: Label
```

The primary button is the strongest filled element on the screen.

Only one primary action should normally exist within a local action group.

---

## Hover

```text
background → rust-deep
```

Duration:

**150ms**

---

## Ghost

```yaml
background: transparent
color: ink
radius: 4px
padding: 10px 12px
font: Label
```

Hover:

```text
background → paper-sunken
```

Ghost is the default secondary action.

Avoid outlined secondary buttons.

---

## Destructive

Destructive actions use:

```text
Alarm text
transparent background
```

Hover:

```text
subtle Alarm tint
```

Never use a filled red destructive button in the reading interface.

---

# 15. Button Rules

Buttons must:

* communicate one clear action
* use Geist
* expose keyboard focus
* have disabled states
* prevent accidental duplicate submission
* preserve readable contrast
* avoid decorative icons unless they improve recognition

Do not:

* animate scale
* translate on hover
* add shadows
* use gradients
* use pill shapes

---

# 16. Inputs

## Default

```yaml
background: transparent
color: ink
border: 1px solid rule
radius: 4px
height: 40px
padding: 10px 12px
font: Label
```

Labels always appear above fields.

Placeholder text is supplementary.

Placeholder text is never a replacement for a label.

---

## Focus

On focus:

```text
border → Rust
focus ring → Rust
```

The focus indicator is:

```text
2px Rust ring
2px paper offset
```

No glow.

---

## Error

Use:

```text
Alarm border
Alarm message
```

Error text uses Meta typography.

Errors should be programmatically associated with their fields.

Dynamic validation messages should be announced using an appropriate accessible mechanism such as:

```html
role="alert"
```

when immediate announcement is appropriate.

---

## Disabled

Disabled controls should become visually quieter without becoming ambiguous.

Do not use extremely low contrast that makes the disabled control indistinguishable from the background.

---

# 17. Focus System

Keyboard accessibility is a product requirement.

Every interactive element must expose a visible focus state.

Canonical focus treatment:

```text
2px Rust ring
2px paper offset
```

Focus must never be removed with:

```css
outline: none;
```

unless an equivalent visible focus treatment is provided.

Focus indicators must remain visible in both themes.

---

# 18. Post Row — Signature Component

The post row is the defining component of Marginalia.

It replaces the conventional content card.

## Structure

```text
────────────────────────────────────────

Title

Excerpt

AUTHOR · DATE · READING TIME

────────────────────────────────────────
```

There is:

* no card
* no shadow
* no radius
* no persistent background
* no surrounding box

---

## Spacing

```yaml
padding-top: 24px
padding-bottom: 24px
border-bottom: 1px solid rule
```

---

## Title

Use:

**Title typography**

Color:

`Ink`

Hover:

`Rust`

---

## Excerpt

Use:

**Fraunces**

Recommended size:

**1rem**

Color:

`Ink Muted`

Maximum:

**2 lines**

---

## Metadata

Use:

**Meta**

Example:

```text
UPENDRA · SEP 5, 2026 · 6 MIN READ
```

Metadata is secondary and should never visually compete with the title.

---

# 19. Post Row Interaction

The entire row should behave as one coherent link target when the destination is a single post.

Hover may introduce a subtle tonal wash using:

```text
Paper Sunken
```

The effect should feel like paper being lightly marked, not a card appearing.

No:

* translation
* scaling
* shadow
* border expansion
* bounce

> **Implementation note.** A row that carries two destinations — the post and its author — cannot be
> one wrapping `<a>`: nesting anchors is invalid HTML. The title's `::after` covers the row instead,
> and secondary links sit above it. Anything else that must be clickable on a row (an action menu)
> belongs outside the row component, not layered on top of it.

---

# 20. Cover Images

When a post contains an image:

```text
96 × 96px
radius: 2px
```

The image sits beside the content.

It is a thumbnail, not a banner.

Images should not dominate the reading hierarchy.

---

# 21. Images

Photography should feel editorial.

Prefer:

* natural crops
* restrained saturation
* near-square proportions
* minimal decoration

Avoid:

* excessive rounded corners
* decorative frames
* gradients
* floating image cards
* artificial shadows

Image radius:

```text
2px
```

unless a component explicitly requires another treatment.

---

# 22. Avatar

Default:

```text
36 × 36px
border-radius: 9999px
border: 1px solid rule
```

Small:

```text
28px
```

Profile:

```text
96px
```

Fallback:

```text
Paper Sunken
uppercase initials
Meta typography
```

Avatars are one of the few places where full rounding is permitted.

---

# 23. Tags

Tags may use full rounding.

```yaml
background: transparent
color: ink-muted
font: Meta
radius: 9999px
padding: 2px 10px
```

Tags should remain visually quiet.

They are metadata, not buttons, unless explicitly interactive.

---

# 24. Utility Surfaces

Cards are permitted only where the interface is acting as a tool rather than presenting reading content.

Examples:

* authentication forms
* administration
* settings
* dialogs
* utility panels
* dense data tables

Allowed treatment:

```yaml
background: paper-raised
border: 1px solid rule
radius: 4px
shadow: none
```

Utility surfaces must never become the dominant visual language of reading pages.

---

# 25. Tables

Tables are utility interfaces.

They may use:

```text
Paper Raised
Rule
Geist
```

Rows should primarily be separated with hairlines.

Avoid:

* zebra striping
* heavy borders
* card-per-row layouts
* excessive rounded containers

Table headers use Meta typography.

Below `md`, a table may become a stacked list of rows rather than scrolling horizontally.

---

# 26. Dialogs

Dialogs are utility surfaces.

Use:

```text
Paper Raised
1px Rule border
4px radius
no shadow
```

A dialog earns separation through:

1. backdrop
2. tonal surface
3. hairline border

not through elevation.

The backdrop should be restrained and must not feel like a dramatic modal effect.

A dialog must trap focus, close on `Escape`, and restore focus to its trigger on close.

---

# 27. Dropdowns and Menus

Menus use:

```text
Paper Raised
1px Rule
4px radius
```

No shadow.

Menu items use Geist.

Hover:

```text
Paper Sunken
```

Focus:

```text
Rust focus ring
```

Menus should feel like sheets of paper placed over the page, not floating application chrome.

---

# 28. Sheets

On mobile, navigation and utility interfaces may become a right-side sheet.

The sheet uses:

```text
Paper Raised
1px Rule
```

No shadow.

The animation is limited to:

```text
transform / opacity
```

and should remain brief and restrained.

Respect:

```text
prefers-reduced-motion
```

---

# 29. Elevation

There are no elevation levels.

Do not create:

```text
elevation-1
elevation-2
elevation-3
```

Depth is represented by:

### Level 1

Space

### Level 2

Hairline

### Level 3

Tonal surface

That is the entire depth system.

---

# 30. Border Rules

Default structural border:

```css
1px solid var(--rule)
```

Borders are always subtle.

Never use:

```text
2px structural borders
3px structural borders
thick outlines
decorative borders
```

The only 2px border-like treatment is the focus indicator.

---

# 31. Radius

```yaml
none: "0px"
sm: "2px"
md: "4px"
lg: "6px"
full: "9999px"
```

### 0px

* post rows
* table rows
* rule-separated structures

### 2px

* images
* thumbnails
* code blocks

### 4px

* buttons
* inputs
* dialogs
* utility surfaces

### Full

* avatars
* tags

Do not use large radii for aesthetic softness.

The geometry should remain close to square.

---

# 32. Motion

Motion is supportive, never expressive.

Allowed properties:

* `color`
* `background-color`
* `opacity`
* limited `transform` for mobile sheets

Duration:

```text
150–200ms
```

Default easing:

```text
ease-out
```

Never use:

* bounce
* spring
* elastic easing
* hover translation
* hover scale
* entrance animations
* spinning decorative elements
* parallax
* attention-seeking motion

---

# 33. Reduced Motion

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

When enabled:

* remove non-essential transitions
* remove sheet animation where possible
* remove decorative motion
* preserve state changes without movement

Functionality must never depend on animation.

---

# 34. Loading States

Loading is part of the product experience.

The application may experience a cold API start of approximately 50 seconds.

Therefore the loading state must be designed intentionally.

Do not immediately present an empty page.

Use quiet editorial loading states such as:

* reserved text space
* restrained progress indication
* contextual loading copy
* skeleton-like tonal placeholders only where necessary

Avoid:

* flashy spinners
* animated skeleton shimmer
* bouncing loaders
* full-screen branded animations

The loading experience should feel like:

> "The page is arriving."

not:

> "The application is broken."

A skeleton must reserve the same space its content will occupy. A loading state that changes the
page height when it resolves is a layout-shift bug, not a loading state.

---

# 35. Empty States

Every collection should have a deliberate empty state.

An empty state should answer:

1. What is empty?
2. Why is it empty?
3. What can the user do next?

Use:

* editorial heading
* short explanation
* one clear action when appropriate

Avoid large illustrations unless they provide meaningful context.

---

# 36. Error States

Errors should be calm and explicit.

Use Alarm only for the actual error state.

An error should provide:

* what failed
* whether data was affected
* what the user can do next

Prefer:

> "We couldn't load your posts. Try again."

over:

> "Something went wrong!"

Errors should never rely solely on color.

An error caused by a server misconfiguration must not blame the person who hit it.

---

# 37. Accessibility

Accessibility is part of the visual system, not an implementation afterthought.

All interfaces must provide:

* keyboard navigation
* visible focus
* semantic HTML
* accessible names
* sufficient text contrast
* accessible error messages
* accessible form labels
* meaningful link text
* appropriate heading hierarchy
* reduced-motion support
* usable touch targets

Color must never be the sole carrier of meaning.

For example:

Incorrect:

```text
red = error
green = success
```

Correct:

```text
icon + text + color
```

where appropriate.

### Contrast requirements

| Content | Minimum |
| --- | --- |
| Body and prose | 4.5:1 |
| Large text (≥24px, or ≥19px bold) | 3:1 |
| Meta and secondary text | 4.5:1 — it is small, so it needs the higher bar |
| Icons and control borders carrying meaning | 3:1 |
| Focus indicator against its background | 3:1 |
| Disabled controls | exempt, but must stay legibly distinguishable |

`ink-muted` on `paper` and `night-ink-muted` on `night` both clear 4.5:1. Any new muted tone must be
measured, not assumed.

---

# 38. Content Hierarchy

Every page should have one dominant reading hierarchy.

Recommended order:

```text
Page identity
↓
Primary heading
↓
Primary content
↓
Secondary information
↓
Metadata
↓
Controls
```

Do not allow utility chrome to visually outrank the content.

---

# 39. Iconography

Icons are functional, not decorative.

Use icons when they:

* improve recognition
* reduce ambiguity
* communicate state
* accompany a familiar action

Do not use icons simply to fill empty space.

Icon rules:

* use a consistent icon family
* keep stroke weight visually compatible
* avoid mixing unrelated icon styles
* do not place icons beside every label
* do not use decorative icon clusters

Icons should generally inherit the surrounding text color.

An icon that is the only content of a control must carry an accessible name; an icon beside a label
is decorative and should be hidden from assistive technology.

---

# 40. Links

Inline links inside prose use:

```text
Rust
```

They must remain recognizable without relying solely on hover.

Prefer an underline or another persistent textual distinction where needed for accessibility.

Navigation links may rely on the active navigation treatment because their surrounding context establishes them as interactive elements.

---

# 41. Dark Mode

Dark mode is:

**the same room at night.**

It is not a color inversion.

The hierarchy remains identical:

```text
Paper → Night
Ink → Night Ink
Muted Ink → Night Ink Muted
Rule → Night Rule
Rust → Night Rust
Alarm → Night Alarm
```

Do not introduce:

* pure black backgrounds
* pure white text
* blue-grey surfaces
* neon accents
* high-contrast futuristic treatments

Dark mode should feel warm, literary, and quiet.

---

# 42. Component State Model

Every interactive component should explicitly define:

```text
default
hover
focus-visible
active / pressed
disabled
loading
error
selected
```

Not every component requires every state, but states should be deliberate rather than inherited accidentally.

---

# 43. State Priority

When states overlap, use this conceptual priority:

```text
Error
↓
Disabled
↓
Focus
↓
Active
↓
Hover
↓
Default
```

Accessibility states must never be visually suppressed by decorative states.

---

# 44. Interaction Rules

Interactions should feel immediate but calm.

Default transition:

```text
150ms ease-out
```

Interactive changes should never:

* shift surrounding layout unexpectedly
* move the pointer target
* cause content jumps
* resize text
* change component dimensions on hover

Prefer changing:

```text
color
background
opacity
border color
```

over changing geometry.

---

# 45. Forms

Forms should be narrow enough to read comfortably.

Recommended maximum:

```text
42rem
```

Group fields by meaning.

Use vertical spacing rather than field cards.

Recommended structure:

```text
Section heading

Helper text

Label
Input

Label
Input

Label
Input

Actions
```

Do not create a card around every field.

Every input needs a real `<label for>`. A `<div>` with a click handler is not a control, and a
placeholder is not a label.

---

# 46. Authentication

Authentication screens are utility interfaces and may use:

```text
Paper Raised
1px Rule
4px radius
```

However, the surrounding page should remain editorial.

The form is a tool placed inside the Reading Room, not a separate visual universe.

---

# 47. Admin Interfaces

Admin interfaces may be denser than editorial pages.

They may use:

* utility surfaces
* tables
* compact controls
* stronger grouping

But they must retain:

* warm neutral palette
* Geist controls
* Fraunces where content is read
* hairline rules
* no shadows
* restrained rust usage

Density is permitted.

Visual noise is not.

---

# 48. Z-Index / Layering

Keep the layering vocabulary intentionally small.

Recommended conceptual levels:

```text
base content
navigation
dropdown
sheet
dialog
toast
```

Do not create arbitrary z-index values throughout the application.

Use a centralized layering scale.

The exact numeric values are implementation details; the semantic hierarchy is the design rule.

---

# 49. Scrollbars

Scrollbars should remain native where possible.

Do not introduce decorative scrollbar treatments.

Do not create highly contrasting custom scrollbars that compete with the content.

---

# 50. Selection

Text selection should remain usable and visually consistent with the warm palette.

Avoid highly saturated browser-selection overrides.

Reading and writing must remain comfortable when users select text.

---

# 51. Focus, Hover, and Touch

Hover is optional.

Focus is mandatory.

Touch must not depend on hover.

Therefore every interaction must remain understandable when:

* mouse is unavailable
* keyboard is primary
* touch is primary
* reduced motion is enabled

A control that only appears on hover is unreachable by touch and invisible to keyboard users even
when focusable. Render it always, or put it behind an explicit menu.

---

# 52. Performance Rules

Visual restraint should extend to implementation.

Avoid unnecessary:

* large image payloads
* animated assets
* continuous JavaScript animations
* decorative video
* expensive blur layers
* layout-triggering animations

Prefer:

* CSS transitions
* responsive images
* lazy loading for below-fold media
* stable layout dimensions
* minimal DOM decoration

The aesthetic should also be computationally quiet.

Typography is a performance decision as well as a visual one: load only the axes actually varied,
and do not ship a font family nothing renders in. Fonts sit on the critical path for the largest
contentful paint.

---

# 53. Design Anti-Patterns

The following are considered deviations from Marginalia:

### Visual

* card grids for posts
* excessive rounded corners
* gradients
* glassmorphism
* glows
* shadows
* neon colors
* pure black
* pure white
* cold grey
* multiple accent colors

### Layout

* excessive full-width text
* cramped content
* arbitrary max-widths
* nested cards
* dense dashboard-style reading pages

### Typography

* sans-serif article body
* serif controls
* excessive uppercase
* tiny body text
* multiple competing display headings

### Interaction

* hover movement
* scaling
* bounce
* unnecessary animation
* hidden keyboard focus
* color-only state communication
* controls that only appear on hover

### Content

* decorative illustrations without purpose
* metadata competing with titles
* excessive badges
* icon-heavy navigation

---

# 54. Exception Policy

A deviation from the design system is acceptable only when it solves a concrete product, accessibility, or platform problem.

Every exception should answer:

1. What problem does the deviation solve?
2. Why can't the existing system solve it?
3. What is the smallest deviation required?
4. Does it introduce a new visual vocabulary?

Do not add exceptions simply because a component "looks better" with them.

The system is intentionally restrictive.

Its consistency is the aesthetic.

---

# 55. Decision Framework

When designing a new component, ask these questions in order:

### 1. Can space solve the problem?

If yes, use space.

### 2. Can a hairline solve it?

If yes, use a hairline.

### 3. Can typography solve it?

If yes, use hierarchy.

### 4. Can a tonal surface solve it?

If yes, use `Paper Raised` or `Paper Sunken`.

### 5. Does it truly need a container?

If yes, use the smallest sanctioned utility surface.

### 6. Does it truly need an accent?

If yes, use Rust.

### 7. Is the accent already used elsewhere?

If yes, reconsider.

---

# 56. Component Construction Rule

Every new component should define:

```text
Purpose
Anatomy
Typography
Spacing
Color
Border
Radius
States
Responsive behavior
Accessibility
Motion
```

If any of these are undefined, the component is not fully specified.

---

# 57. Production Quality Checklist

Before shipping a screen, verify:

## Visual

* [ ] No pure black
* [ ] No pure white
* [ ] No arbitrary grey
* [ ] No unnecessary shadows
* [ ] No gradients
* [ ] No glassmorphism
* [ ] No excessive rounded corners
* [ ] Rust remains rare
* [ ] Hairlines are used consistently

## Typography

* [ ] Reading content uses Fraunces
* [ ] Controls use Geist
* [ ] Body text is at least 18px
* [ ] Prose remains within 68ch
* [ ] Heading hierarchy is clear
* [ ] Only one display heading exists when appropriate

## Layout

* [ ] Container owns page width
* [ ] No arbitrary page max-width
* [ ] Spacing follows the 4px scale
* [ ] Major sections have sufficient air
* [ ] Mobile layout is intentional

## Interaction

* [ ] Hover does not move elements
* [ ] Focus is clearly visible
* [ ] Keyboard navigation works
* [ ] Touch targets are usable
* [ ] Loading state exists
* [ ] Empty state exists
* [ ] Error state exists
* [ ] Disabled state exists where appropriate

## Accessibility

* [ ] Semantic HTML
* [ ] Labels are visible
* [ ] Errors are announced appropriately
* [ ] Color is not the sole state indicator
* [ ] Focus is never removed without replacement
* [ ] Reduced motion is respected
* [ ] Contrast is sufficient

## Dark Mode

* [ ] No pure black
* [ ] No pure white
* [ ] Warm dark neutrals remain intact
* [ ] Rust remains readable
* [ ] Rules remain visible but subtle
* [ ] Hierarchy matches light mode

## Verifiable by machine

These are checked rather than eyeballed:

* [ ] `npx impeccable detect client/app client/components client/lib` reports nothing
* [ ] Lighthouse accessibility is 100 on the changed route
* [ ] Zero console errors or warnings on load *and* after opening every menu, sheet and dialog
* [ ] Cumulative Layout Shift is 0

---

# 58. Final Design Laws

These are the non-negotiable laws of Marginalia.

### 01 — The Writing Wins

Content receives the strongest visual hierarchy.

### 02 — Space Before Ornament

When uncertain, add air before adding decoration.

### 03 — Rules Before Boxes

A hairline is preferable to a card.

### 04 — Flat at Rest

There are no shadows.

### 05 — Serif Reads, Sans Operates

Fraunces communicates the work.

Geist communicates the tool.

### 06 — 68ch Maximum

Readable prose never becomes a banner.

### 07 — One Voice

Rust is rare and meaningful.

### 08 — Rust Is Not Alarm

Rust means act.

Alarm means danger.

### 09 — No Pure Values

Never use pure black, pure white, or cold zero-chroma grey.

### 10 — Focus Is Sacred

Keyboard focus must always be visible.

### 11 — Motion Is Quiet

Nothing bounces, jumps, or demands attention.

### 12 — Dark Mode Is the Same Room at Night

Dark mode preserves the same visual hierarchy.

### 13 — Cards Are Tools, Not Content

Utility surfaces may use cards.

Reading content should not.

### 14 — The System Is Restrictive on Purpose

Consistency is not a limitation of the design.

Consistency **is** the design.

---

# 59. Canonical Token Summary

The YAML frontmatter at the top of this file is the machine-readable copy of everything below, and
is what the tooling reads. Keep the two in step.

```yaml
marginalia:
  colors:
    paper: "oklch(0.980 0.008 80)"
    paper-raised: "oklch(0.995 0.004 85)"
    paper-sunken: "oklch(0.955 0.009 78)"

    ink: "oklch(0.240 0.015 45)"
    ink-muted: "oklch(0.520 0.015 50)"
    rule: "oklch(0.900 0.010 75)"

    rust: "oklch(0.520 0.140 40)"
    rust-deep: "oklch(0.440 0.145 38)"
    alarm: "oklch(0.550 0.210 18)"

    night: "oklch(0.190 0.008 60)"
    night-raised: "oklch(0.220 0.009 60)"
    night-sunken: "oklch(0.240 0.010 60)"

    night-ink: "oklch(0.920 0.008 80)"
    night-ink-muted: "oklch(0.680 0.012 70)"
    night-rule: "oklch(0.300 0.010 60)"

    night-rust: "oklch(0.680 0.130 42)"
    night-alarm: "oklch(0.650 0.180 22)"

  typography:
    display: "clamp(2.5rem, 6vw, 4rem)"
    headline: "clamp(1.75rem, 3.5vw, 2.5rem)"
    title: "1.25rem"
    body: "1.125rem"
    label: "0.875rem"
    meta: "0.8125rem"

  layout:
    prose: "42rem"
    index: "48rem"
    page: "72rem"
    prose-measure: "68ch"

  spacing:
    xs: "4px"
    sm: "8px"
    md: "16px"
    lg: "24px"
    xl: "40px"
    2xl: "64px"
    3xl: "96px"

  radius:
    none: "0px"
    sm: "2px"
    md: "4px"
    lg: "6px"
    full: "9999px"

  motion:
    fast: "150ms"
    standard: "200ms"
    easing: "ease-out"

  focus:
    ring: "2px"
    offset: "2px"

  breakpoints:
    sm: "640px"
    md: "768px"
    lg: "1024px"
    xl: "1280px"
```

---

# 60. The Marginalia Test

Before accepting a design, ask:

> **Does this look like a reading room, or does it look like a SaaS application pretending to be one?**

If it looks like a SaaS application:

* remove a card
* remove a shadow
* remove an icon
* reduce the accent
* increase the whitespace
* simplify the border
* strengthen the typography
* let the content breathe

The correct solution is usually quieter.

**Marginalia should feel designed when you notice it, and invisible when you read it.**

---

# 61. Where This Is Enforced

The system is enforced mechanically wherever it can be, because a rule nobody checks is a
suggestion.

| Rule | Enforced by |
| --- | --- |
| Tokens, no raw colours | `client/app/globals.css` is the only place a colour is defined |
| No shadows, no gradients, no glass, AI-generated tells | `npx impeccable detect` (61 rules) plus a hook on every `Edit`/`Write` to a UI file |
| Page width | the layout `Container`; pages never set their own `max-width` |
| Prose measure | `.prose { max-width: 68ch }` in `globals.css` |
| Contrast, focus, touch targets, semantics | Lighthouse accessibility on the changed route |
| Console cleanliness | headless run over every page, menus and dialogs opened |
| Type roles | `html { font-family: sans }` with `h1,h2,h3` set to the display serif |

A shell edit made with `sed` bypasses the detector hook. Run `npx impeccable detect` by hand after
one.
