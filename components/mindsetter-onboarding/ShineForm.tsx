'use client';

import { UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { saveShine } from '@/app/[locale]/mindsetter-onboarding/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from '@/i18n/navigation';
import { BLOCK_SLUGS, type BlockSlug, buildBlockHref } from '@/lib/mindsetter-onboarding/blocks';
import type { CompletenessTier } from '@/lib/mindsetter-onboarding/completeness';

type ShineFormProps = {
  completeness: {
    percent: number;
    tier: CompletenessTier;
  };
};

/**
 * "Make your profile shine" picker (step 4/5 — Personal session moved to the last core step,
 * product decision D9 — onboarding doc section 6). Manages the optional-
 * block checkbox selection entirely as local client state — the selection itself is never
 * persisted (handed to the first picked block screen via the `blocks.ts` query-param handoff
 * instead, see that file's header comment); only `mindsetter_profiles.onboarding_step` needs to
 * advance here, via `saveShine`, same as every earlier step.
 *
 * Each row is "name + description + a circular checkbox on the right" (doc section 6) — only
 * the `Checkbox` itself is the click target, not the whole row, so this never nests one
 * interactive element inside another.
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
    <div className="flex flex-col gap-6">
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2 rounded-[16px] border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">{t('shine.completeness.label')}</span>
          <span className="text-base font-bold text-foreground">
            {completeness.percent}% · {t(`shine.completeness.tier.${completeness.tier}`)}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${completeness.percent}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('shine.listHeading')}
        </h2>

        <div className="flex flex-col divide-y divide-border rounded-[16px] border border-border bg-card">
          {BLOCK_SLUGS.map((slug) => {
            const isChecked = selected.has(slug);
            return (
              <div key={slug} className="flex items-center justify-between gap-4 p-4">
                <div className="flex flex-col gap-0.5">
                  <p className="text-base font-bold text-foreground">
                    {t(`shine.blocks.${slug}.name`)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(`shine.blocks.${slug}.description`)}
                  </p>
                </div>
                <Checkbox
                  shape="circle"
                  checked={isChecked}
                  onCheckedChange={() => toggle(slug)}
                  aria-label={t(`shine.blocks.${slug}.name`)}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button type="button" variant="secondary" size="lg" disabled={pending} onClick={handleSkip}>
          {t('shine.skip')}
        </Button>

        {selectedCount > 0 ? (
          <Button
            type="button"
            variant="primary"
            size="lg"
            loading={pending}
            onClick={handleContinue}
          >
            <UserPlus aria-hidden="true" />
            {pending ? t('common.saving') : t('shine.continueFill', { count: selectedCount })}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
