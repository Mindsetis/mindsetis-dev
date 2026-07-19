'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { saveShine } from '@/app/[locale]/mindsetter-onboarding/actions';
import { CompletenessIcon } from '@/components/icons/onboarding-section-icons';
import {
  SHINE_BLOCK_ICONS,
  ShineOptionCheckedIcon,
  ShineOptionUncheckedIcon,
} from '@/components/icons/shine-block-icons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { BLOCK_SLUGS, type BlockSlug, buildBlockHref } from '@/lib/mindsetter-onboarding/blocks';
import type { CompletenessTier } from '@/lib/mindsetter-onboarding/completeness';

type ShineFormProps = {
  completeness: {
    percent: number;
    tier: CompletenessTier;
  };
};

/** "Continue fill (N section)" button icon (16×16) — provided verbatim by the designer,
 * hardcoded `fill="black"` (matches `primary`'s black text/icon color), not `currentColor`. */
function ContinueFillIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <g clipPath="url(#shine-continue-fill-clip)">
        <path
          d="M8.57245 9.36388C9.02618 9.41218 9.33464 9.8206 9.33464 10.2769V13.667C9.33464 14.2193 8.88692 14.667 8.33464 14.667H3.66797C3.11568 14.667 2.65818 14.2151 2.76054 13.6724C3.22646 11.2022 5.39567 9.33366 8.0013 9.33366C8.19425 9.33366 8.3848 9.3439 8.57245 9.36388ZM8.0013 8.66699C5.7913 8.66699 4.0013 6.87699 4.0013 4.66699C4.0013 2.45699 5.7913 0.666992 8.0013 0.666992C10.2113 0.666992 12.0013 2.45699 12.0013 4.66699C12.0013 6.87699 10.2113 8.66699 8.0013 8.66699ZM12.0013 11.3337V10.0003C12.0013 9.63214 12.2998 9.33366 12.668 9.33366C13.0362 9.33366 13.3346 9.63214 13.3346 10.0003V11.3337H14.668C15.0362 11.3337 15.3346 11.6321 15.3346 12.0003C15.3346 12.3685 15.0362 12.667 14.668 12.667H13.3346V14.0003C13.3346 14.3685 13.0362 14.667 12.668 14.667C12.2998 14.667 12.0013 14.3685 12.0013 14.0003V12.667H10.668C10.2998 12.667 10.0013 12.3685 10.0013 12.0003C10.0013 11.6321 10.2998 11.3337 10.668 11.3337H12.0013Z"
          fill="black"
        />
      </g>
      <defs>
        <clipPath id="shine-continue-fill-clip">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

/**
 * "Make your profile shine" picker (step 4/5 — Personal session moved to the last core step,
 * product decision D9 — onboarding doc section 6). Manages the optional-
 * block checkbox selection entirely as local client state — the selection itself is never
 * persisted (handed to the first picked block screen via the `blocks.ts` query-param handoff
 * instead, see that file's header comment); only `mindsetter_profiles.onboarding_step` needs to
 * advance here, via `saveShine`, same as every earlier step.
 *
 * Each row is "name + description + a selection icon on the right" (doc section 6) — only the
 * icon button itself is the click target, not the whole row, so this never nests one interactive
 * element inside another. The selection icon swaps between `ShineOptionUncheckedIcon`/
 * `ShineOptionCheckedIcon` (product-supplied assets, 2026-07-19) rather than the shared
 * `Checkbox` component, since this screen's checked/unchecked look is bespoke.
 */
export function ShineForm({ completeness }: ShineFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const [selected, setSelected] = useState<ReadonlySet<BlockSlug>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function toggle(slug: BlockSlug) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  /** Shared tail for both "Continue fill" and "Skip" — both mean the picker step itself is done
   * (doc decision: advance `onboarding_step` either way), they only differ in destination. */
  async function advanceAndNavigate(destination: string) {
    setFormError(null);
    setPending(true);
    const result = await saveShine({});
    setPending(false);

    if (!result.ok) {
      setFormError(result.error.message);
      return;
    }

    router.push(destination);
  }

  function handleSkip() {
    // Personal session is the next (and last) core step regardless of which/any optional blocks
    // were picked (product decision D9 — Personal session moved after this picker).
    void advanceAndNavigate('/mindsetter-onboarding/session');
  }

  function handleContinue() {
    const orderedSelected = BLOCK_SLUGS.filter((slug) => selected.has(slug));
    if (orderedSelected.length === 0) return;
    void advanceAndNavigate(buildBlockHref(orderedSelected, 0));
  }

  const selectedCount = selected.size;

  return (
    <div className="flex flex-col">
      {formError ? (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex items-center gap-3 rounded-[16px] border border-border bg-card p-4">
        <CompletenessIcon />
        <div className="flex flex-col">
          <span className="text-[24px] leading-none font-bold text-[#79b9e3]">
            {completeness.percent}% · {t(`shine.completeness.tier.${completeness.tier}`)}
          </span>
          <span className="text-[12px] text-muted-foreground">{t('shine.completeness.label')}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <h2 className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('shine.listHeading')}
        </h2>

        <div className="flex flex-col gap-2">
          {BLOCK_SLUGS.map((slug) => {
            const isChecked = selected.has(slug);
            const BlockIcon = SHINE_BLOCK_ICONS[slug];
            return (
              <div
                key={slug}
                className="flex items-start justify-between gap-4 border-b border-border pb-4"
              >
                <div className="flex max-w-[277px] flex-col gap-0 md:max-w-[289px]">
                  <p className="flex items-center gap-2 text-base font-bold text-foreground">
                    <BlockIcon className="size-4 shrink-0" />
                    {t(`shine.blocks.${slug}.name`)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(`shine.blocks.${slug}.description`)}
                  </p>
                </div>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isChecked}
                  aria-label={t(`shine.blocks.${slug}.name`)}
                  onClick={() => toggle(slug)}
                  className="mt-[3px] shrink-0 cursor-pointer md:mt-[4.5px]"
                >
                  {isChecked ? <ShineOptionCheckedIcon /> : <ShineOptionUncheckedIcon />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 md:flex-row">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={pending}
          onClick={handleSkip}
          className="md:flex-1"
        >
          {t('shine.skip')}
        </Button>

        {selectedCount > 0 ? (
          <Button
            type="button"
            variant="primary"
            size="lg"
            loading={pending}
            onClick={handleContinue}
            className="md:flex-1"
          >
            <ContinueFillIcon />
            {pending ? t('common.saving') : t('shine.continueFill', { count: selectedCount })}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
