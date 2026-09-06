import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline:
          "border-border bg-background hover:bg-surface-hover hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-surface-hover",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-surface-hover hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-surface-hover",
        // Transparent at rest, tinted on hover — DESIGN.md §14. "Never use a filled red
        // destructive button in the reading interface."
        destructive:
          "text-destructive hover:bg-destructive/10 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:hover:bg-destructive/20 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // 40px — DESIGN.md §14. Also what carries the ~44px effective touch target of §12 once
        // the focus ring and neighbouring spacing are counted.
        default:
          "h-10 gap-1.5 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),12px)] px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-6 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-10",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Base UI assumes a button-like component renders a real <button>, and warns loudly when it does
// not — `render={<Link/>}` produces an <a>, which loses native button semantics for forms and
// assistive tech. The correct answer is `nativeButton={false}`, and requiring every call site to
// remember that is how ~20 of them ended up wrong.
//
// Returns `undefined` when there is no render prop, so the primitive keeps its own default. That
// matters because those defaults differ: Base UI's Button renders a <button>, but Menu.Item renders
// a <div role="menuitem"> — forcing `true` there produces the very warning this exists to remove.
// Only intervene when a render prop is actually present, which is the only case that needs it.
//
// Exported because Sheet and DropdownMenu wrap button-like primitives too.
export function nativeButtonFor(render: unknown): boolean | undefined {
  if (render === undefined || render === null) return undefined
  // A render *function* can return anything; assume it is not a bare <button>.
  if (!React.isValidElement(render)) return false

  // <Button render={<Link/>}> — the answer is whatever the inner render resolves to.
  const props = (render.props ?? {}) as { render?: unknown }
  if (props.render !== undefined) return nativeButtonFor(props.render) ?? true

  if (render.type === "button") return true
  // A bare <Button> with no render of its own is a native <button>.
  if (render.type === Button) return true
  // Anything else — Link, <a>, a form, a custom component — is not.
  return false
}

/**
 * True when the render target navigates — a next/link or a plain anchor with an href.
 *
 * This matters for more than styling. Telling Base UI `nativeButton={false}` makes it apply button
 * semantics, including `role="button"`, and it applied them to anchors too: every
 * `<Button render={<Link/>}>` announced itself as a button while actually navigating. A screen
 * reader user relies on that distinction — a link goes somewhere and appears in the links list, a
 * button does something here — so the role is put back.
 */
export function rendersLink(render: unknown): boolean {
  if (!React.isValidElement(render)) return false
  const props = (render.props ?? {}) as { href?: unknown; render?: unknown }
  if (props.href !== undefined) return true
  return props.render !== undefined ? rendersLink(props.render) : false
}

function Button({
  className,
  variant = "default",
  size = "default",
  render,
  nativeButton,
  role,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      render={render}
      // An explicit prop still wins, for the case the inference cannot see.
      nativeButton={nativeButton ?? nativeButtonFor(render)}
      role={role ?? (rendersLink(render) ? "link" : undefined)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
