'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const labelVariants = cva('flex items-center gap-2 leading-none text-foreground select-none', {
  variants: {
    variant: {
      // Figma "tiny simple" text style — 14px/regular on desktop, 12px/regular on mobile
      // (responsive via the shared `--text-tiny` token, same breakpoint as the rest of the
      // type scale). Used for plain field labels (Username, Country, City, Language, BIO,
      // About, First/Last name, Email, Password…).
      default: 'text-tiny font-normal',
      // Figma "tiny spacing" text style — bold, uppercase, 30%-tracked (`tracking-[0.3em]`),
      // secondary/gray text, sized off the same responsive `--text-tiny` token. This is the
      // exact recipe already used elsewhere for this Figma text style (see
      // `RegistrationProgress`'s step counter and `HeroSection`'s eyebrow labels). Used for
      // the social-link labels, "Profile photo*", and "Choose your interests" — anywhere the
      // plain default label is too light.
      boldSpacing: 'text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type LabelProps = ComponentProps<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>;

function Label({ className, variant, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        labelVariants({ variant }),
        'group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-60',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}

export { Label, labelVariants };
