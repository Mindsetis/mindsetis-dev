import { getTranslations } from 'next-intl/server';

import { JoinIcon } from '@/components/icons/join-icon';
import { QuestionFillIcon } from '@/components/icons/main-page-icons';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

/**
 * Main Page hero band — Figma "Main Page" (`572:5427` desktop, confirmed via the file's own
 * organizational "Main Page" section, `552:3983`, which groups this frame with its mobile
 * counterpart `1249:18262`; an older, unfinished duplicate frame of the same name lives
 * disconnected from that section elsewhere on the canvas and was not used here).
 *
 * Badge pill ("ONLY") has no exported solid fill in Figma (gradient, matching the button
 * gradients used elsewhere in this design) — approximated with the flat `bg-primary` token
 * (`Badge`'s own `brand` variant resolves to the same value) rather than reproducing the
 * gradient, since the visual difference at this small pill size is negligible and every other
 * brand-blue surface on this page already resolves to the same token.
 *
 * The world map + avatar-pin illustration (Figma "map-base 1", `838:11152`, ~3,300 vector nodes)
 * is exported as a single flattened image (`public/images/main-page-avatar-map.png`) rather than
 * rebuilt node-by-node — standard practice for a complex illustration asset, not an
 * approximation of the design itself (pixel-identical to the Figma source, alpha background so
 * it sits on the page's own black background without a seam).
 *
 * "How it works" has no prototype destination in Figma (`get_reactions` returned empty) — routed
 * to an in-page anchor at the "What you actually get here" section below (`#how-it-works`),
 * which is the natural "here's how it works" landing spot on this page.
 */
export async function HeroBand() {
  const t = await getTranslations('home.main.hero');
  const tNav = await getTranslations('nav');

  return (
    <section className="relative overflow-hidden">
      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col items-center gap-6 px-4 pt-12 text-center sm:px-6 md:gap-8 md:pt-16 lg:px-[70px] lg:pt-20">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <span className="font-display text-l leading-none font-normal text-foreground md:text-[2rem]">
            {t('badge')}
          </span>
          <span className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-1 font-display text-tiny leading-none font-normal text-primary-foreground md:px-6 md:py-2 md:text-m">
            {t('badgeTag')}
          </span>
        </div>

        <h1 className="max-w-4xl font-display text-h1 leading-none font-normal whitespace-pre-line text-foreground md:text-h2">
          {t('title')}
        </h1>

        <div className="flex w-full max-w-md flex-col gap-4 sm:w-auto sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/join">
              <JoinIcon className="hidden md:inline" />
              {tNav('join')}
            </Link>
          </Button>
          <Button asChild variant="primaryOutline" size="lg" className="w-full sm:w-auto">
            <a href="#how-it-works">
              <QuestionFillIcon className="hidden size-4 md:inline" />
              {t('howItWorksCta')}
            </a>
          </Button>
        </div>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element -- local static asset, plain <img> matches the rest of the codebase's precedent for non-optimized local marketing art */}
      <img
        src="/images/main-page-avatar-map.png"
        alt={t('avatarMapAlt')}
        className="relative z-0 mt-8 h-auto w-full max-w-[1440px] mx-auto md:mt-4"
      />
    </section>
  );
}
