'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const labelVariants = cva('flex items-center gap-2 leading-none text-foreground select-none', {
  variants: {
    variant: {
      // Figma: label is 12px/regular (fixed size — uses Tailwind's default `text-xs`
      // rather than the responsive `--text-tiny` token, which is 14px on desktop).
      default: 'text-xs font-normal',
      // Figma "tiny spacing" text style: 12/14px Bold (700) with letter-spacing. Used
      // for the social-link labels, "Profile photo*", and "Choose your interests" —
      // anywhere the plain 12px/regular default is too light.
      boldSpacing: 'text-xs font-bold tracking-wide',
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
