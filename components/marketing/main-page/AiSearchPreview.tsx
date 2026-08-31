import { getTranslations } from 'next-intl/server';

import { CheckCircleFillIcon } from '@/components/icons/check-circle-fill-icon';
import { SparklingFillIcon } from '@/components/icons/main-page-icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { GRADIENT_HEADING_CLASSNAME } from './gradient-heading';
import { SectionEyebrow } from './SectionEyebrow';

/**
 * "What expertise is useful for you right now?" — Figma `1189:6233`/`1189:6240`/`1189:6245`
 * (AI-search eyebrow + heading, search box, "POPULAR SEARCHES" chips).
 *
 * Per CLAUDE.md ("Togglable modules… AI-search must be switchable from the admin settings
 * without a redeploy. Gate their entry points on an admin-controlled flag") — that admin flag
 * doesn't exist yet, and there's no AI-search backend for this input to call. Rendered as an
 * illustrative, non-functional preview of the feature (the `readOnly` input, disabled submit
 * button, and non-interactive chips) rather than half-wiring a form with nowhere to send its
 * data — the same "flag the tradeoff instead of guessing a backend" approach as everywhere else
 * this design assumes functionality the app doesn't have yet.
 */
export async function AiSearchPreview() {
  const t = await getTranslations('home.main.aiSearch');
  const popularSearches = t.raw('popularSearches') as string[];

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-16 sm:px-6 md:py-20 lg:px-[70px] lg:py-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <SectionEyebrow icon={<SparklingFillIcon className="size-4" />} label={t('eyebrow')} />
        <h2
          className={cn(
            'font-display text-l leading-[0.9] font-normal md:text-h2',
            GRADIENT_HEADING_CLASSNAME,
          )}
        >
          {t('title')}
        </h2>
        <p className="text-body whitespace-pre-line text-foreground">{t('subtitle')}</p>
      </div>

      <div className="relative mx-auto mt-10 flex max-w-3xl flex-col gap-4 overflow-hidden rounded-3xl bg-black p-6 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          readOnly
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          className="relative z-10 w-full bg-transparent text-body text-primary-hover placeholder:text-primary-hover focus:outline-none"
        />
        <Button size="default" className="relative z-10 w-full shrink-0 sm:w-auto" disabled>
          {t('searchCta')}
        </Button>
      </div>

      <div className="mx-auto mt-6 flex max-w-3xl flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('popularLabel')}
        </span>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {popularSearches.map((search, index) => (
            <span
              key={`${search}-${index}`}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-tiny text-foreground"
            >
              <CheckCircleFillIcon className="size-[18px] text-primary" />
              {search}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
