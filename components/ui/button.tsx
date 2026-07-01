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
  'inline-flex shrink-0 items-center justify-center gap-3 whitespace-nowrap rounded-lg text-base font-bold transition-colors outline-none disabled:pointer-events-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  {
    variants: {
      variant: {
        // Figma: mobile Primary CTA (e.g. header "Join") is a flat `--color-primary` fill
        // with no gradient/glow; the gradient + soft glow only appear on desktop (`md:`+).
        // Default/hover at `md:` and up: gradient fill (angle unconfirmed — see
        // --gradient-primary). Active/disabled always drop the gradient for a flat token
        // color, on every breakpoint.
        primary:
          'bg-primary text-primary-foreground md:bg-[image:var(--gradient-primary)] md:shadow-glow-primary active:bg-primary-active active:bg-[image:none] disabled:bg-primary-disabled disabled:bg-[image:none] disabled:shadow-none',
        secondary:
          'bg-secondary text-secondary-foreground border border-border hover:bg-white/[0.06] active:bg-white/[0.1] disabled:text-muted-foreground disabled:hover:bg-secondary',
        // Border + text color change on hover/active; background never changes.
        outline:
          'border border-border bg-transparent text-border hover:border-foreground hover:text-foreground active:border-muted-foreground active:text-muted-foreground disabled:border-border disabled:text-border',
        // Border stays a constant translucent white across all states; only text/icon
        // color changes (distinct from `outline`, which instead animates the border).
        tertiary:
          'border border-[#ffffff4d] bg-transparent text-foreground hover:text-muted-foreground active:text-primary disabled:text-border',
        // Figma "Secondary - 2a" outline CTA (e.g. sign-up "Continue", onboarding "Next",
        // hero "Continue"): primary-colored border/text with the same soft cyan glow as the
        // solid `primary` variant. Previously duplicated inline (`border-primary text-primary
        // shadow-glow-primary hover:bg-primary/10`) in three places — centralized here.
        primaryOutline:
          'border border-primary bg-transparent text-primary shadow-glow-primary hover:bg-primary/10 active:bg-primary/15 disabled:border-primary-disabled disabled:text-primary-disabled disabled:shadow-none',
        ghost:
          'bg-transparent text-foreground hover:bg-white/[0.06] active:bg-white/[0.1] disabled:text-muted-foreground disabled:hover:bg-transparent',
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
