import { getTranslations } from 'next-intl/server';

import { HeroEmailCta } from './HeroEmailCta';
import { OnboardingCta } from './OnboardingCta';

/**
 * Welcome-screen hero — Figma "Welcome Screen - 1440 px" (desktop) / "Welcome Screen"
 * (mobile), Mindsetis design file. Server Component; the client islands are the email
 * capture form at the bottom (`HeroEmailCta`) and the "See platform features" button
 * (`OnboardingCta`), which opens the onboarding tour as a popup rather than navigating to a
 * page (reworked 2026-07-18 — see `OnboardingCta`/`OnboardingDialog`).
 *
 * The video embed is a placeholder test YouTube video (2026-07-18) — swap in the real
 * platform-intro video once that asset exists. The email capture below records a "signup
 * intent" lead (spec §5.2, reworked stage 1.7) and routes straight into `/sign-up`.
 */
export async function HeroSection() {
  const t = await getTranslations('home.hero');

  return (
    <section className="mx-auto flex max-w-[640px] flex-col gap-6 px-4 pt-8 pb-20 sm:px-6 lg:gap-8 lg:px-0 lg:pt-[100px] lg:pb-[150px]">
      <div className="flex flex-col gap-1 md:gap-4">
        <h1 className="bg-[linear-gradient(95.47deg,#fff_4.71%,#87bce6_99.92%)] bg-clip-text font-display text-h1 leading-[1.1] text-transparent md:text-h3 md:leading-[0.9]">
          {t('title')}
        </h1>
        <p className="text-body font-medium text-foreground md:font-normal">{t('subtitle')}</p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('watchLabel')}
        </p>

        <div className="h-[200px] w-full overflow-hidden rounded-2xl bg-card md:h-[400px]">
          <iframe
            className="size-full"
            src="https://www.youtube.com/embed/M7lc1UVf-VE"
            title={t('clickToWatch')}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="h-px flex-1 bg-border" />
          <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
            {t('or')}
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <p className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('tourLabel')}
        </p>

        <OnboardingCta />
      </div>

      <HeroEmailCta />
    </section>
  );
}
