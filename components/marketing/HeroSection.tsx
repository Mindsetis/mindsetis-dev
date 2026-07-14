import { ArrowRight, Play } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

import { HeroEmailCta } from './HeroEmailCta';
import { LeadCaptureDialog } from './LeadCaptureDialog';

/**
 * Welcome-screen hero — Figma "Welcome Screen - 1440 px" (desktop) / "Welcome Screen"
 * (mobile), Mindsetis design file. Server Component; the client islands are the email
 * capture form at the bottom (`HeroEmailCta`) and the "I'm on the way" lead-capture escape
 * hatch (`LeadCaptureDialog`) rendered just below it.
 *
 * The "video" thumbnail is a static placeholder — the design has a "Click for watching"
 * card but no actual video asset/URL to wire up. Swap in a real video player once that
 * content exists. "See platform features" routes into the onboarding tour
 * (`/onboarding`); the email capture below routes straight into `/sign-up` instead.
 * `LeadCaptureDialog` is a separate, lower-commitment path (spec §5.2) — it never routes
 * into `/sign-up` and has no dedicated Figma frame (deliberate UI freedom, ROADMAP 1.3).
 */
export async function HeroSection() {
  const t = await getTranslations('home.hero');

  return (
    <section className="mx-auto flex max-w-[640px] flex-col gap-12 px-4 py-16 sm:px-6 lg:px-0 lg:py-24">
      <div className="flex flex-col gap-6">
        <h1 className="text-h1 font-display leading-[1.1] text-foreground md:bg-gradient-to-r md:from-white md:via-primary md:to-gradient-end md:bg-clip-text md:text-h3 md:leading-[0.9] md:text-transparent">
          {t('title')}
        </h1>
        <p className="text-body font-medium text-foreground md:font-normal">{t('subtitle')}</p>
      </div>

      <div className="flex flex-col gap-6">
        <p className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('watchLabel')}
        </p>

        <div className="flex h-[200px] w-full flex-col items-center justify-center gap-4 rounded-2xl bg-card md:h-[400px]">
          <Play className="size-[50px] fill-primary text-primary" aria-hidden="true" />
          <p className="max-w-[130px] text-center text-base font-bold text-foreground">
            {t('clickToWatch')}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span className="h-px flex-1 bg-border" />
          <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
            {t('or')}
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <p className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('tourLabel')}
        </p>

        <Link
          href="/onboarding"
          className="flex h-14 w-full items-center justify-between rounded-xl border border-border px-5 text-base font-bold text-foreground transition-colors hover:bg-white/[0.06]"
        >
          {t('seeFeatures')}
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary">
            <ArrowRight className="size-4 text-white" aria-hidden="true" />
          </span>
        </Link>
      </div>

      <HeroEmailCta />
      <LeadCaptureDialog />
    </section>
  );
}
