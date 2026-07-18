import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Mindsetis Button (Figma-aligned, UI Kit audit). Radius is 12px (`rounded-lg`), base
 * type is 16px/bold across variants; `nav` keeps its own pill shape via variant override.
 */
const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-3 whitespace-nowrap rounded-lg text-base font-bold outline-none transition-[color,background-color,background-image,border-color,box-shadow] duration-200 ease-out disabled:pointer-events-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-colors [&_svg]:duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  {
    variants: {
      variant: {
        // Figma: mobile Primary CTA (e.g. header "Join") is a flat `--color-primary` fill
        // with no gradient/glow; the gradient + soft glow only appear on desktop (`md:`+).
        // States confirmed 2026-07-17: normal/hover share the same gradient (hover just
        // drops the shadow), active swaps to a darker gradient, disabled stays the existing
        // flat token color at every breakpoint (unchanged from before). Desktop gradient/flat
        // swaps go through the `gradient-fill` utility (`app/styles/base.css`) — like
        // `primaryOutline`'s border, a plain `background` transition can't interpolate between
        // two different gradients (or gradient→flat), so that utility crossfades two stacked
        // layers via opacity instead; mobile is untouched (real solid `background-color`,
        // which transitions smoothly on its own since it's solid-to-solid).
        primary:
          'gradient-fill bg-primary text-primary-foreground active:bg-primary-active disabled:bg-primary-disabled disabled:shadow-none md:bg-transparent md:shadow-glow-primary md:hover:shadow-none md:active:bg-transparent md:active:shadow-none md:disabled:bg-transparent md:[--btn-fill-normal:var(--gradient-primary)] md:[--btn-fill-active:var(--gradient-primary-active)] md:[--btn-fill-disabled:var(--color-primary-disabled)]',
        secondary:
          'bg-secondary text-secondary-foreground border border-border hover:bg-white/[0.06] active:bg-white/[0.1] disabled:text-muted-foreground disabled:hover:bg-secondary',
        // Border + text color change on hover/active; background never changes. States
        // confirmed 2026-07-17.
        outline:
          'border border-border bg-transparent text-foreground hover:border-foreground hover:text-foreground active:border-muted-foreground active:text-muted-foreground disabled:border-border disabled:text-border',
        // Border stays a constant translucent white across all states; only text/icon
        // color changes (distinct from `outline`, which instead animates the border).
        tertiary:
          'border border-[#ffffff4d] bg-transparent text-foreground hover:text-muted-foreground active:text-primary disabled:text-border',
        // Figma "Secondary - 2a" outline CTA (e.g. sign-up "Continue", onboarding "Next",
        // hero "Continue"): gradient-edged border (see `gradient-border` utility,
        // `app/styles/base.css` — plain Tailwind `border-*` can't render a gradient, and a
        // single pseudo-element can't smoothly transition BETWEEN two different gradients, so
        // that utility crossfades two stacked layers via opacity instead) + primary-colored
        // text, same soft cyan glow as the solid `primary` variant. States confirmed
        // 2026-07-17: hover/disabled use a flat solid border color instead of a gradient (the
        // masking technique doesn't care whether a layer's `background` is a gradient or a
        // flat color); background stays transparent at every state (no more
        // `hover:bg-primary/10` tint). All four `--btn-border-gradient-*` custom properties
        // are set unconditionally here — `gradient-border`'s own `:hover`/`:active`/`:disabled`
        // selectors (not Tailwind variants) pick the right one per state.
        primaryOutline:
          'gradient-border border-0 bg-transparent text-primary shadow-glow-primary-outline [--btn-border-gradient-normal:var(--gradient-primary-border)] [--btn-border-gradient-hover:var(--color-primary-hover)] [--btn-border-gradient-active:var(--gradient-primary-active)] [--btn-border-gradient-disabled:var(--color-primary-disabled)] hover:text-primary-hover hover:shadow-none active:text-primary-active active:shadow-none disabled:text-primary-disabled disabled:shadow-none',
        // No border, no background at any state — pure text-color transitions. States
        // confirmed 2026-07-17 (previously used a translucent white background tint on
        // hover/active instead; replaced with color-only per the new spec).
        ghost:
          'bg-transparent text-foreground hover:text-muted-foreground active:text-primary disabled:text-border',
        // "Find out who a Mindsetter is"-style CTA (direct product request, 2026-07-17): white
        // text, `#747474` border (`border-input`), text pinned left / trailing icon pinned
        // right (`justify-between`, not the base `justify-center` — content is meant to span
        // the button's full width). Hover only brightens the border to white; active recolors
        // both border AND text to brand-blue `primary`; disabled drops both to `#747474`
        // (`border-input`/`text-input`) — a different active-state color than the plain
        // `outline` variant above (which uses muted-foreground gray on active), so this can't
        // just reuse `outline` — it's its own variant. `px-5` (20px) horizontal padding is
        // deliberately NOT baked in here — `size="lg"`'s own `px-8` would otherwise win the
        // padding conflict (variant classes are earlier than size classes in this cva's output,
        // so a variant-level padding utility loses to a same-property size utility under
        // `cn()`'s last-one-wins merge); set `px-5` via the consumer's own `className` instead,
        // which is appended last and correctly overrides both.
        outlineArrow:
          'justify-between border border-input bg-transparent text-foreground hover:border-foreground active:border-primary active:text-primary disabled:border-input disabled:text-input',
        link: 'rounded-none bg-transparent p-0 text-primary hover:text-primary-hover active:text-primary-active disabled:text-primary-disabled',
        nav: 'rounded-full bg-transparent text-muted-foreground hover:bg-white/[0.06] hover:text-foreground active:bg-white/[0.1] disabled:text-muted-foreground disabled:hover:bg-transparent',
      },
      size: {
        default: 'h-14 px-5 text-base',
        // Figma "header mobile" Join CTA (46px tall, 24px horizontal padding). The UI Kit
        // "Primary" component set (261:3431) defines a single 16px/bold text size for
        // every state — there's no separate small type scale for buttons — so `sm` only
        // shrinks the box, it doesn't override `text-base font-bold` from the base class.
        sm: 'h-[46px] px-6',
        lg: 'h-14 px-8 text-base',
        icon: 'size-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Shows a spinner and disables the button, without changing its layout/size. */
    loading?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  // Slot (asChild) requires a single child element to merge props onto — it isn't used
  // for a `loading` state (that only applies to real `<button>` submits), so skip the
  // injected spinner there rather than breaking `React.Children.only`.
  if (asChild) {
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Comp>
    );
  }

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </Comp>
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
