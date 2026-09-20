'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { useUnsavedChanges } from '@/components/dashboard/unsaved-changes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The submit row shared by every Mindsetter step/block form, in its two modes.
 *
 * ONBOARDING (default, `editMode` omitted): a single "Save & Continue" button — byte-for-byte the
 * markup each form carried inline before this was extracted, so wizard behavior is unchanged.
 *
 * CABINET (`editMode`): "Back" + "Save & Next" (label overridable, see `saveLabel`), per Release-1
 * C3 (2026-09-19) — this SUPERSEDES the 2026-08-11 "Cancel discards edits and stays on the
 * section" decision recorded lower in this file's history. The client asked for the button
 * explicitly named "Back" and paired it with an "unsaved changes" warning, which only makes sense
 * for a button that LEAVES the section — so unlike the old "Cancel", clicking it (once confirmed,
 * or immediately when the form is clean) navigates back to the section list rather than reverting
 * fields in place. Each cabinet form still owns that navigation itself (`onCancel`, called with
 * the form already clean since there's nothing left to preserve once the page is about to
 * unmount) — this component only decides WHEN to ask first.
 *
 * "Ask first" is now delegated to `useUnsavedChanges().guard` (Release-1 C-continuation,
 * 2026-09-19) rather than a local `isDirty` prop + a dialog of its own: the caller reports its
 * live dirty state up to that same shared context via `useSectionDirtyGuard` (so the header,
 * sidebar and account menu can guard THEIR links too), and "Back" here just asks the same
 * context to decide — one `AlertDialog` instance for every exit path on the page, not one per
 * component. Never a native `confirm()` (blocks automated testing; project rule is `AlertDialog`
 * from the UI Kit instead).
 *
 * The forms themselves also keep owning where a SUCCESSFUL save goes now: "Save & Next" — the
 * renamed "Save changes" — walks to the NEXT section in cabinet card order (`nextHref`, computed by
 * each page from `lib/profile/completeness.ts#nextSectionHref`), or back to the section list once
 * the last section (`videoBlog`) saves. That, too, is a product decision made explicit by the "Next"
 * in the button's own name; see `use-cabinet-saved.ts` for the mechanics. Sessions Setup is the one
 * exception — see `saveLabel`.
 */
export type StepActionsProps = {
  editMode?: boolean;
  isSubmitting: boolean;
  /**
   * Cabinet mode only: leaves the section (back to `/dashboard/profile`). Called immediately when
   * the form has no unsaved edits, or after the visitor confirms "Leave" in the warning dialog.
   * Still required (not optional) even though the wizard never renders the button that calls it —
   * same reasoning as before: an optional prop would fail silently at exactly the call site that
   * forgot it.
   */
  onCancel: () => void;
  /**
   * Cabinet mode only: overrides the primary button's label (`tCabinet('saveAndNext')` by
   * default). Sessions Setup passes `saveChanges` instead — deliberate exception (Release-1
   * C-continuation, 2026-09-19): "Save & Next" promises a following section, but Sessions Setup
   * isn't one of the thirteen profile sections `nextSectionHref` orders, so there is no "next" to
   * name.
   */
  saveLabel?: string;
  /**
   * Applied to the ONBOARDING button only. Several block forms pin a negative top margin here to
   * tighten the gap between "+ Add …" and the submit button; that spacing is specific to the
   * wizard's single-button layout, so it must not leak into the cabinet's two-button row.
   */
  className?: string;
  /**
   * Opt out of `type="submit"`. `ReelLifeForm` isn't an RHF `<form>` at all — it manages tiles in
   * local state and saves from a click handler — so it passes its handler here and gets a
   * `type="button"` submit control instead.
   */
  onSubmit?: () => void;
  /** Blocks submitting without blocking Back (Reel Life uses it while an upload is in flight). */
  disabled?: boolean;
};

export function StepActions({
  editMode,
  isSubmitting,
  onCancel,
  saveLabel,
  className,
  onSubmit,
  disabled,
}: StepActionsProps) {
  const submitProps = onSubmit
    ? ({ type: 'button', onClick: onSubmit } as const)
    : ({ type: 'submit' } as const);
  const t = useTranslations('mindsetterOnboarding');
  const tCabinet = useTranslations('dashboard.profile');
  const { guard } = useUnsavedChanges();

  /**
   * Whether the cabinet bar is actually PINNED right now, as opposed to sitting at the end of the
   * form where it naturally belongs. Only the pinned state gets a surface of its own: while the
   * bar floats over scrolling fields it needs an opaque background and a top edge so the content
   * underneath doesn't bleed through, but once the form ends and the bar rejoins normal flow that
   * same background reads as a stray panel welded under the buttons (owner's call on
   * `/dashboard/sessions`, 2026-09-20, where the form is short enough to never pin at all).
   *
   * Detected with a 1px sentinel rendered directly BELOW the bar: while that sentinel is on
   * screen, the bar is at its resting place; once it scrolls out of view the bar is holding the
   * viewport's bottom edge. CSS has no `:stuck` selector to ask this directly, and reading
   * `getBoundingClientRect` on scroll would cost a layout read per frame.
   */
  const [isPinned, setIsPinned] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsPinned(!entry?.isIntersecting),
      // Trims the very edge of the viewport so the sentinel doesn't read as "visible" at the exact
      // pixel the bar is pinned over it.
      { rootMargin: '0px 0px -1px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  if (!editMode) {
    return (
      <Button
        {...submitProps}
        variant="primaryOutline"
        size="lg"
        loading={isSubmitting}
        disabled={disabled}
        className={className}
      >
        {isSubmitting ? t('common.saving') : t('common.saveAndContinue')}
      </Button>
    );
  }

  return (
    /* Sticky bottom action bar (Release-1 C3): stays pinned to the bottom of the viewport
       while a long section form scrolls (Hero alone is twelve fields), instead of requiring a
       scroll all the way down to reach Save. `sticky`, not `fixed` — it stays inside its own
       containing block (the section CARD on desktop, the bare page on mobile) rather than
       floating over unrelated page chrome full-viewport-width, and it naturally rejoins normal
       flow once the form itself ends. Same technique already proven in this codebase by the
       site Header (`sticky top-0`, `Header.tsx`) and the cabinet sidebar
       (`lg:sticky lg:top-[112px]`, `CabinetSidebar.tsx`). `bg-background`/`lg:bg-card` matches
       whichever surface this bar sits on at that breakpoint (the bare page vs. the section
       card), so content scrolling underneath never shows through — but only while it IS pinned;
       see `isPinned` above for why the surface disappears once the bar comes to rest. `z-10` keeps
       it above the form fields it slides over; the site Header's `z-40` and any dialog's `z-50`
       both still win. */
    <>
      <div
        className={cn(
          'sticky bottom-0 z-10 flex flex-row gap-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:pt-4 lg:pb-4',
          isPinned && 'border-t border-[#2a2a2a] bg-background lg:bg-card',
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => guard(onCancel)}
          disabled={isSubmitting}
          className="h-[52px] flex-1 px-4 lg:h-14 lg:flex-none lg:px-8"
        >
          {tCabinet('back')}
        </Button>
        <Button
          {...submitProps}
          variant="primary"
          size="lg"
          loading={isSubmitting}
          disabled={disabled}
          className="h-[52px] flex-1 px-4 lg:h-14 lg:flex-none lg:px-8"
        >
          {isSubmitting ? t('common.saving') : (saveLabel ?? tCabinet('saveAndNext'))}
        </Button>
      </div>

      {/* Sentinel for `isPinned` — see its doc comment. Purely a measuring device: no height of
          its own beyond the 1px the observer needs, nothing to announce. */}
      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
    </>
  );
}
