import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Mindsetis Button. Pill-shaped by default (spec: 56px-tall primary CTAs) — radius was
 * synthesized (no radius tokens in Figma); back-check once available.
 */
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors outline-none disabled:pointer-events-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-glow-primary hover:bg-primary-hover active:bg-primary-active disabled:bg-primary-disabled disabled:shadow-none',
        secondary:
          'bg-secondary text-secondary-foreground border border-border hover:bg-white/[0.06] active:bg-white/[0.1] disabled:text-muted-foreground disabled:hover:bg-secondary',
        outline:
          'border border-border bg-transparent text-foreground hover:bg-white/[0.06] active:bg-white/[0.1] disabled:text-muted-foreground disabled:hover:bg-transparent',
        tertiary:
          'border border-border bg-transparent text-foreground hover:bg-white/[0.06] active:bg-white/[0.1] disabled:text-muted-foreground disabled:hover:bg-transparent',
        ghost:
          'bg-transparent text-foreground hover:bg-white/[0.06] active:bg-white/[0.1] disabled:text-muted-foreground disabled:hover:bg-transparent',
        link: 'rounded-none bg-transparent p-0 text-primary underline-offset-4 hover:underline disabled:text-muted-foreground',
        nav: 'rounded-full bg-transparent text-muted-foreground hover:bg-white/[0.06] hover:text-foreground active:bg-white/[0.1] disabled:text-muted-foreground disabled:hover:bg-transparent',
      },
      size: {
        default: 'h-11 px-6 text-sm',
        sm: 'h-9 px-4 text-tiny',
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
