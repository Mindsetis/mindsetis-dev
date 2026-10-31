'use client';

import { useTranslations } from 'next-intl';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';

import { GuardedLink } from '@/components/dashboard/GuardedLink';
import { useUnsavedChanges } from '@/components/dashboard/unsaved-changes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The previous wizard step, for the bottom "Back" next to "Save and continue". Provided by the
 * PAGE around the form — the only thing that knows the step order and the `?blocks=&i=` handoff —
 * so the eleven shared form components don't each need a new prop threaded through to here. `null`
 * (no provider: the cabinet, or a form used outside the wizard) keeps the single primary button.
 *
 * History: Back sat in this row from 2026-09-29, moved to the top-left corner on 30.10.2026
 * (Release-2 П6, call of 28.10) and came back here on 31.10.2026 — the owner wants it in one
 * container with "Save and continue", pinned with it, on every wizard step. Only the screens with
 * no primary button at all (`/verify-email`, `/welcome`, `/mindsetter-onboarding/congrats`) keep a
 * top-left Back (`StickyBackLink`).
 */
const OnboardingBackContext = createContext<string | null>(null);

export function OnboardingBack({ href, children }: { href: string; children: ReactNode }) {
  return <OnboardingBackContext.Provider value={href}>{children}</OnboardingBackContext.Provider>;
}

/** The surrounding `OnboardingBack` href, for forms with a submit row of their own (Shine). */
export function useOnboardingBackHref(): string | null {
  return useContext(OnboardingBackContext);
}

/**
 * The wizard's "Back", shared by `WizardActionBar`, `ShineForm` and the Member wizard's 4/4
 * (`BuildProfileForm`). A `GuardedLink` styled as a button, so it goes through the same
 * unsaved-changes guard as the site header's links: an edited step asks before it is dropped, and
 * Cmd/Ctrl/middle-click still opens the previous step in a new tab untouched.
 *
 * `disabled` (a save in flight) cannot use the native attribute on an anchor, so it mirrors the
 * `outline` variant's own disabled look and takes the link out of the pointer/tab order.
 */
export function OnboardingBackButton({
  href,
  disabled,
  className,
}: {
  href: string;
  disabled?: boolean;
  className?: string;
}) {
  const tCabinet = useTranslations('dashboard.profile');
  return (
    <Button
      asChild
      variant="outline"
      size="lg"
      className={cn(
        'px-4 md:px-8',
        disabled && 'pointer-events-none border-border text-border',
        className,
      )}
    >
      <GuardedLink
        href={href}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
      >
        {tCabinet('back')}
      </GuardedLink>
    </Button>
  );
}

/**
 * A row of form actions that stays pinned to the bottom of the viewport while a long form scrolls,
 * instead of requiring a scroll all the way down to reach Save. First built for the cabinet
 * (Release-1 C3); since the call of 28.10.2026 the Mindsetter wizard's "Save & Continue" sits in
 * one too, and since 31.10.2026 the wizard's Back is pinned together with it in the same bar.
 *
 * `sticky`, not `fixed` — it stays inside its own containing block (the section CARD on desktop,
 * the bare page on mobile and throughout the wizard) rather than floating over unrelated page
 * chrome full-viewport-width, and it naturally rejoins normal flow once the form itself ends. Same
 * technique already proven in this codebase by the site Header (`sticky top-0`, `Header.tsx`) and
 * the cabinet sidebar (`lg:sticky lg:top-[112px]`, `CabinetSidebar.tsx`). `z-10` keeps it above the
 * form fields it slides over; the site Header's `z-40` and any dialog's `z-50` both still win.
 *
 * Only the PINNED state gets a surface of its own: while the bar floats over scrolling fields it
 * needs an opaque background and a top edge so the content underneath doesn't bleed through, but
 * once the form ends and the bar rejoins normal flow that same background reads as a stray panel
 * welded under the buttons (owner's call on `/dashboard/sessions`, 2026-09-20, where the form is
 * short enough to never pin at all). `surface` picks the background the bar sits on: the cabinet's
 * section card from `lg` up, or the bare page everywhere in the wizard.
 *
 * Pinned-ness is detected with a 1px sentinel rendered directly BELOW the bar: while that sentinel
 * is on screen, the bar is at its resting place; once it scrolls out of view the bar is holding
 * the viewport's bottom edge. CSS has no `:stuck` selector to ask this directly, and reading
 * `getBoundingClientRect` on scroll would cost a layout read per frame.
 */
export function StickyActionBar({
  surface,
  className,
  children,
}: {
  surface: 'card' | 'page';
  className?: string;
  children: ReactNode;
}) {
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

  return (
    <>
      <div
        // Read by `components/ui/form-errors.ts` to keep a revealed error clear of the bar.
        data-sticky-action-bar=""
        className={cn(
          'sticky bottom-0 z-10 flex flex-row gap-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:pt-4 lg:pb-4',
          isPinned && 'border-t border-[#2a2a2a] bg-background',
          isPinned && surface === 'card' && 'lg:bg-card',
          className,
        )}
      >
        {children}
      </div>

      {/* Sentinel for `isPinned` — see the doc comment. Purely a measuring device: no height of
          its own beyond the 1px the observer needs, nothing to announce. */}
      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
    </>
  );
}

/**
 * The wizard's pinned `[Back | primary]` pair — ONE component for the Mindsetter steps/blocks
 * (via `StepActions`) and the Member wizard's 4/4 (`BuildProfileForm`), so Back has the same
 * container, size and pinned behaviour everywhere (owner's call, 31.10.2026).
 *
 * Both buttons are `flex-1`, i.e. halves, in ONE row at every width, so the pair fits a 375px phone
 * too. Measured with the real Manrope Bold 16px: "Save and continue" is 143px, "Guardar y
 * continuar" 154px, "Back"/"Atrás" 37/41px. On a 343px row (375 minus the page's 16px padding) the
 * label floor of the primary button (text + the 16px side padding below `md`) is 175px (en) /
 * 186px (es), so it takes marginally more than half and Back gets the rest (156/145px) — nothing
 * wraps or overflows down to a 320px screen. `md` and up use the roomier 32px padding.
 *
 * `backHref` is `null` when no `OnboardingBack` wraps the form: the primary button then stands
 * alone, as before.
 */
export function WizardActionBar({
  backHref,
  isSubmitting,
  label,
  pendingLabel,
  onSubmit,
  disabled,
  className,
}: {
  backHref: string | null;
  isSubmitting: boolean;
  label: string;
  pendingLabel: string;
  /** Opt out of `type="submit"` — see `StepActionsProps.onSubmit`. */
  onSubmit?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const submitProps = onSubmit
    ? ({ type: 'button', onClick: onSubmit } as const)
    : ({ type: 'submit' } as const);

  return (
    <StickyActionBar surface="page" className={className}>
      {backHref ? (
        <OnboardingBackButton href={backHref} disabled={isSubmitting} className="flex-1" />
      ) : null}
      <Button
        {...submitProps}
        variant="primaryOutline"
        size="lg"
        loading={isSubmitting}
        disabled={disabled}
        className="flex-1 px-4 md:px-8"
      >
        {isSubmitting ? pendingLabel : label}
      </Button>
    </StickyActionBar>
  );
}

/**
 * The submit row shared by every Mindsetter step/block form, in its two modes.
 *
 * ONBOARDING (default, `editMode` omitted): `[Back | Save and continue]` side by side in one
 * pinned bar (`WizardActionBar`) — the Back's target comes from the page's `OnboardingBack`
 * provider, so the forms don't carry it. Pinned to the bottom of the screen while the step scrolls
 * (calls of 28.10 and 31.10.2026).
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
   * Applied to the ONBOARDING row only. Several block forms pin a negative top margin here to
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
  const onboardingBackHref = useOnboardingBackHref();

  if (!editMode) {
    return (
      <WizardActionBar
        backHref={onboardingBackHref}
        isSubmitting={isSubmitting}
        label={t('common.saveAndContinue')}
        pendingLabel={t('common.saving')}
        onSubmit={onSubmit}
        disabled={disabled}
        className={className}
      />
    );
  }

  return (
    <StickyActionBar surface="card">
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
    </StickyActionBar>
  );
}
