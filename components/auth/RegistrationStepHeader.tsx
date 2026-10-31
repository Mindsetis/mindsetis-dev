import { getTranslations } from 'next-intl/server';

import { RegistrationProgress } from '@/components/auth/RegistrationProgress';
import { StickyBackLink } from '@/components/auth/StickyBackLink';
import { cn } from '@/lib/utils';

type RegistrationStepHeaderProps = {
  /** Top-left Back link. Passed only by `/welcome` (→ the previous step, `/build-profile`).
   * `/verify-email` has none (owner's call, 31.10.2026 — see that page's doc comment). Since
   * 2026-09-29 the other wizard steps have none too: `/build-profile` carries it in
   * its bottom row instead, `/sign-up` has nothing before it, and `/member-profile` is
   * deliberately without one (its previous step, "check your inbox", is meaningless once the
   * address is confirmed, and `/sign-up` is closed to signed-in visitors). */
  backHref?: string;
  step: number;
  total: number;
  label: string;
  /** Forwarded to `RegistrationProgress` — see its own doc comment. Only the `/welcome`
   * Congrats screen (`step === total`, nothing left "in progress") passes this; the four
   * in-wizard steps leave it unset. */
  complete?: boolean;
  /** Extra classes on the progress row — `/welcome` uses it to shrink the 100px gap under the
   * progress bar on low viewports (`short:`). */
  className?: string;
};

/**
 * Shared step-header chrome (Back link + `RegistrationProgress`) for the four registration
 * wizard pages (`/sign-up`, `/verify-email`, `/member-profile`, `/build-profile`) plus the
 * post-wizard `/welcome` Congrats screen (added 2026-08-18) — previously duplicated verbatim in
 * each page. Composes `StickyBackLink`/`RegistrationProgress` rather than reimplementing them.
 *
 * `label` is the `RegistrationProgress` accessible label (e.g. "Step 1 of 4" — caller-supplied
 * since it embeds the step number). The Back link's own label (`t('signUp.back')`, "Back") is
 * identical across all four steps, so this (async server) component fetches it itself instead
 * of taking it as a prop.
 *
 * Layout: on mobile the progress bar sits on top and the Back link under it, left-aligned, 12px gap.
 * On desktop the progress bar is centered and Back is pinned to the left edge of the same row.
 *
 * The Back is a `StickyBackLink`: it stays in view under the site header while the page scrolls, at
 * every width (see its doc comment). A sticky box cannot leave its parent, and this header row is
 * only one row tall, so the Back is NOT inside the row: it is rendered as a sibling, directly in the
 * page's wrapper, and there are two instances, one per layout (`display: none` hides the other, so
 * exactly one is ever visible/focusable and no invisible placeholder is needed):
 *   - from `md` it comes BEFORE the row and hangs over it: the box is 24px tall, `-mb-[22px]` and
 *     `-mt-0.5` cancel that height so the row starts where it always did, and the `-mt-0.5` lines
 *     the link up with the progress row's centre, where the old absolutely-positioned link sat
 *     (the row is 16.8px tall there, the link 24px);
 *   - below `md` it comes AFTER the row, in flow, so it lands under the progress bar by itself (no
 *     hardcoded offset), and carries the 32px gap to the content (the row's own `mb-3` is the
 *     12px gap above it).
 *
 * This component must therefore be a direct child of the page's wrapper `div`.
 *
 * `/welcome`'s own Figma frame (`387:3000`) only carries a Back link on the desktop layer tree
 * — the mobile frame (`421:3523`) has no Back element at all. Rendering it on mobile here too is
 * a deliberate deviation for consistency with the other three steps (which all show it on every
 * width) rather than adding a one-off `hidden md:flex` special case for a single caller; flagged
 * in `/welcome`'s own doc comment as well.
 */
export async function RegistrationStepHeader({
  backHref,
  step,
  total,
  label,
  complete,
  className,
}: RegistrationStepHeaderProps) {
  const t = await getTranslations('auth');

  return (
    <>
      {backHref ? (
        <StickyBackLink
          href={backHref}
          label={t('signUp.back')}
          className="-mt-0.5 -mb-[22px] hidden md:block"
        />
      ) : null}

      <div
        className={cn(
          'flex flex-col items-start md:mb-[100px] md:flex-row md:items-center md:justify-center',
          // Below `md` the Back (when there is one) follows this row and carries the 32px gap itself.
          backHref ? 'mb-3' : 'mb-8',
          className,
        )}
      >
        {/* Progress spans the form width (max-w-640) and is centered over the form. With a Back
            hanging over the row's left edge (md+), it also leaves 90px clear on each side, so on a
            tablet (768–~820px, where 640px nearly fills the row) the bar doesn't run under "Back". */}
        <div
          className={cn(
            'w-full max-w-[640px] flex-1 md:flex-none',
            backHref && 'md:max-w-[min(640px,calc(100%-180px))]',
          )}
        >
          <RegistrationProgress step={step} total={total} label={label} complete={complete} />
        </div>
      </div>

      {backHref ? (
        <StickyBackLink href={backHref} label={t('signUp.back')} className="mb-8 md:hidden" />
      ) : null}
    </>
  );
}
