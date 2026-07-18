import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * `tailwind-merge`'s default config only recognizes Tailwind's built-in font-size scale
 * (`text-xs`/`sm`/`lg`/`xl`/`2xl`...) as the "font-size" class group — it has no knowledge of
 * this project's custom `@theme` type scale (`text-tiny`/`text-h1`/`text-h2`/`text-h3`/`text-l`/
 * `text-m`/`text-body`, defined in `app/styles/tokens/typography.css`). Without this extension,
 * those custom size utilities fall through to the much broader `text-color` group matcher
 * instead, so e.g. `cn('text-tiny', 'text-muted-foreground')` silently drops `text-tiny` (both
 * get treated as the same "conflicting" group, last one wins) — found via a live mobile-
 * viewport bug where `FormLabel`'s `boldSpacing` variant (`components/ui/label.tsx`) lost its
 * responsive `text-tiny` sizing to `text-muted-foreground` every time the two were combined,
 * rendering 16px (the browser default) instead of the intended 14px/12px desktop/mobile.
 * Registering the custom scale here tells `tailwind-merge` these are font-size utilities,
 * distinct from color, so both classes survive the merge.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['tiny', 'h1', 'h2', 'h3', 'l', 'm', 'body'] }],
    },
  },
});

/** Merge conditional class names, resolving Tailwind class conflicts (last one wins). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
