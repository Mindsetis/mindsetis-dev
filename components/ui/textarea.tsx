'use client';

import type { Ref, TextareaHTMLAttributes } from 'react';
import { useEffect, useMemo, useRef } from 'react';

import { cn, mergeRefs } from '@/lib/utils';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /**
   * React 19 lets a plain function component (no `forwardRef`) accept `ref` as a regular prop —
   * every caller here does `<Textarea autoGrow {...field} />` where RHF's `field` carries its
   * own `ref` this way. Declared explicitly so it's merged with the internal `textareaRef`
   * below (`mergeRefs`) instead of one silently overriding the other.
   */
  ref?: Ref<HTMLTextAreaElement>;
  /**
   * Figma "filled/valid" state: white border only (no icon — `Textarea` has no room for the
   * right-side check icon `Input` uses). Additive to the native textarea API — omit for the
   * default/error states.
   */
  valid?: boolean;
  /**
   * Mindsetter-extended-onboarding auto-grow variant (spec §9/E.3: several onboarding
   * textareas — Role/Superpower/Expertise description, F*ckup story, Philosophy quote —
   * start at a single-line `Input`-like height and grow with content instead of scrolling
   * internally). Implemented via a native `input`-event listener (not React's `onChange`,
   * which RHF's `{...field}` spread would otherwise let win an ordering fight if this
   * wrapped `onChange` instead) that resizes `style.height` to `scrollHeight`, `resize-none`
   * since height is JS-driven. Starts at `min-h-14` (56px) — same as the non-autoGrow default
   * below, which also matches `Input`'s `h-14` — just without the JS resize-on-input behavior.
   * Purely additive: omitted, this renders identically to before.
   */
  autoGrow?: boolean;
};

function Textarea({ className, valid, autoGrow, ref, ...props }: TextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Merge the caller's `ref` (e.g. RHF's `field.ref`) with the internal one the autoGrow effect
  // below reads from — see the `ref` prop's doc comment. Memoized so the callback ref's identity
  // only changes when the caller's `ref` actually does, not on every render.
  const composedRef = useMemo(() => mergeRefs(ref, textareaRef), [ref]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!autoGrow || !el) return;

    const resize = () => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    };

    resize();
    el.addEventListener('input', resize);
    return () => el.removeEventListener('input', resize);
  }, [autoGrow]);

  return (
    <textarea
      ref={composedRef}
      data-slot="textarea"
      data-valid={valid ? '' : undefined}
      className={cn(
        'flex w-full rounded-lg border border-input bg-transparent p-4 text-base font-medium text-foreground outline-none transition-colors',
        'placeholder:text-muted-foreground',
        'focus-visible:border-input-focus',
        'aria-invalid:border-destructive',
        'disabled:cursor-not-allowed disabled:opacity-60',
        autoGrow ? 'min-h-14 resize-none overflow-hidden' : 'min-h-14',
        valid && 'border-input-focus',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
export type { TextareaProps };
