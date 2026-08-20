import { getTranslations } from 'next-intl/server';

import { HeroEmailCta } from './HeroEmailCta';

/**
 * Welcome-screen hero — Figma "Welcome Screen - 1440 px" (`1112:17898`, desktop, confirmed via
 * a live `get_selection` 2026-08-18 — the file has a second, unrelated frame with the identical
 * name) / "Welcome Screen " (`1112:19307`, mobile). Server Component; the only client island is
 * the email capture form at the bottom (`HeroEmailCta`).
 *
 * 2026-08-18: the video block ("Watch to understand why" label, video placeholder, "or"
 * divider, "Take a 2-min platform tour" label, "See platform features" `OnboardingCta`) was
 * REMOVED from here. It's still present in this frame's own Figma layer tree (`Frame 277`
 * inside `Frame 278`) but confirmed hidden via a rendered screenshot of the live selection — the
 * exported PNG shows only heading → subheading → email form → legal line, nothing else. Content
 * column narrowed from 640px to 580px to match this frame's actual measured width
 * (`x=430` on a 1440px canvas, `(1440-580)/2=430`).
 *
 * `OnboardingCta`/`OnboardingDialog` (the 4-step onboarding tour) were NOT deleted — only
 * unhooked from this page, per explicit instruction (this is a product decision about content,
 * not a call to remove working code). `OnboardingDialog` still has a live entry point elsewhere:
 * `RolesPreviewCta` on `/mindsetter-onboarding/roles` opens the same dialog. `OnboardingCta`
 * itself (this page's own trigger button) and `home.hero.seeFeatures` are now unused — see the
 * handoff report; `watchLabel`/`clickToWatch`/`or`/`tourLabel` are unused too (nothing else in
 * the codebase reads them). None of it was removed from `messages/*.json` — left in place in
 * case the video block comes back, rather than guessing it's gone for good.
 */
export async function HeroSection() {
  const t = await getTranslations('home.hero');

  return (
    <section className="mx-auto flex max-w-[580px] flex-col gap-6 px-4 pt-8 pb-20 sm:px-6 lg:gap-8 lg:px-0 lg:pt-[100px] lg:pb-[150px]">
      <div className="flex flex-col gap-1 md:gap-4">
        {/* Figma: `linear-gradient(95.47deg,#fff_4.71%,#87bce6_99.92%)` — kept as-is (this
            frame's own paint style, "gradient / light" on desktop / "gradient / brand" on
            mobile, has no exposed color stops through this MCP server's tools; `export_tokens`
            only surfaces solid-color styles, not gradients, and `get_styles` is blocked for this
            session). The rendered screenshot's white→blue diagonal reads consistent with this
            existing value, so left unchanged rather than guessing new stops. */}
        <h1 className="bg-[linear-gradient(95.47deg,#fff_4.71%,#87bce6_99.92%)] bg-clip-text font-display text-h1 leading-none font-normal text-transparent md:text-h3 md:leading-[0.9]">
          {t('title')}
        </h1>
        <p className="text-body font-medium text-foreground md:font-normal">{t('subtitle')}</p>
      </div>

      <HeroEmailCta />
    </section>
  );
}
