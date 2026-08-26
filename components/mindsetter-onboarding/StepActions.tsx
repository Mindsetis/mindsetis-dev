'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

/**
 * The submit row shared by every Mindsetter step/block form, in its two modes.
 *
 * ONBOARDING (default, `editMode` omitted): a single "Save & Continue" button — byte-for-byte the
 * markup each form carried inline before this was extracted, so wizard behavior is unchanged.
 *
 * CABINET (`editMode`): "Cancel" + "Save changes", per the section-editor frames (Figma `613:4445`
 * and siblings). Cancel DISCARDS the edits and stays on the section (2026-08-11) — it used to
 * navigate back to the list, which made it a duplicate of the "← All sections" link right above
 * it and gave no way to undo a change without also leaving. It still doesn't prompt for
 * confirmation: reverting is now itself the visible feedback (fields snap back), and there's no
 * shared dirty-state/confirm pattern in the app yet.
 *
 * The forms themselves keep owning where a SUCCESSFUL save goes: the eight optional-block forms
 * already took a `nextHref`, so the cabinet routes just pass `/dashboard/profile` and no
 * navigation change was needed; the three core forms (Roles/Superpowers/Help) had their next step
 * hardcoded and now branch on `editMode`.
 */
export type StepActionsProps = {
  editMode?: boolean;
  isSubmitting: boolean;
  /**
   * Restores the form to its last-saved state, called by "Cancel" in cabinet mode. Required (not
   * optional) even though the wizard never renders that button: every consumer supports both
   * modes, so making it mandatory is what guarantees no cabinet editor ends up with a dead
   * Cancel — an optional prop would fail silently at exactly the call site that forgot it.
   */
  onCancel: () => void;
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
  /** Blocks submitting without blocking Cancel (Reel Life uses it while an upload is in flight). */
  disabled?: boolean;
};

export function StepActions({
  editMode,
  isSubmitting,
  onCancel,
  className,
  onSubmit,
  disabled,
}: StepActionsProps) {
  const submitProps = onSubmit
    ? ({ type: 'button', onClick: onSubmit } as const)
    : ({ type: 'submit' } as const);
  const t = useTranslations('mindsetterOnboarding');
  const tCabinet = useTranslations('dashboard.profile');

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

  // Side by side at every width. On a phone they split the row evenly (`flex-1`), which is how the
  // mobile frame draws them at 375 (166.5 + 12 gap + 164.5). From `lg` they size to their own text
  // and sit left — `lg:flex-none` — because the desktop frames draw two compact buttons, not a
  // full-width pair; without it they stretched across the whole editor. 52px tall on mobile, the
  // shared `lg` 56px above that.
  return (
    <div className="flex flex-row gap-3">
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onCancel}
        disabled={isSubmitting}
        className="h-[52px] flex-1 px-4 lg:h-14 lg:flex-none lg:px-8"
      >
        {tCabinet('cancel')}
      </Button>
      <Button
        {...submitProps}
        variant="primary"
        size="lg"
        loading={isSubmitting}
        disabled={disabled}
        className="h-[52px] flex-1 px-4 lg:h-14 lg:flex-none lg:px-8"
      >
        {isSubmitting ? t('common.saving') : tCabinet('saveChanges')}
      </Button>
    </div>
  );
}
