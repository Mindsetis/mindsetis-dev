import { useTranslations } from 'next-intl';

import { NotYetAvailable } from '@/components/ui/not-yet-available';
import { EXAMPLE_PROFILE_URL } from '@/lib/config/example-profile';

const FEATURE_KEYS = ['website', 'sessions', 'growth'] as const;

const SEE_EXAMPLE_CLASSNAME =
  'font-bold text-primary underline underline-offset-2 hover:text-primary-hover';

/**
 * Dark card on `/welcome` pitching the Mindsetter path — Figma "Frame 657" (`1180:36147`
 * desktop / `1183:36447` mobile), sitting between the "What's the difference…" pill and the
 * "Apply for Mindsetter" button (see `WelcomeCtas`). `cornerRadius 24`, `bg-card` (`#1a1a1a`),
 * `p-8` desktop / `p-4` mobile (Figma padding: 32px desktop, 16px mobile).
 *
 * The heading and all three feature titles use a "gradient / brand" text fill in Figma, not a
 * flat color — reused via the existing `--gradient-primary` token (`app/styles/tokens/
 * effects.css`, the same gradient `primary`/`primaryOutline` buttons already use) through
 * `bg-clip-text`, rather than hardcoding new stops.
 *
 * Only the first feature ("Personal Brand Website") carries a CTA ("See example", Figma
 * "Navigation button" `1182:36163` — same round trailing-arrow badge as the `outlineArrow`
 * button variant, so it reuses `MindsetterArrowIcon` instead of a near-duplicate icon). Figma
 * also has a small pill-shaped "See EXAMPLE" tag (`Frame 469`, `1180:36086`) sitting inline next
 * to that feature's title — confirmed via screenshot it never actually renders (fully covered/
 * hidden in both exported frames), so it's treated as leftover paste debris and not built, same
 * precedent as the orphan sub-form noted in `WhoIsMindsetterDialog`'s doc comment.
 *
 * "See example" opens the client's showcase profile in a new tab once `EXAMPLE_PROFILE_URL` is
 * configured (`lib/config/example-profile.ts`, shared with the Roles step's "See how it looks").
 * That profile doesn't exist yet, so until then it opens the `NotYetAvailable` dialog rather than
 * a dead `<Link href="/">`, same pattern as the other unbuilt CTAs on this screen.
 *
 * Since 2026-09-29 (client request, to free up space) "See example" is an inline link at the end of
 * the feature's own sentence instead of the Figma button with the arrow badge below it — same
 * dialog, one line shorter card.
 */
export function WelcomeMindsetterPitchCard() {
  const t = useTranslations('auth.welcome.mindsetterPitch');

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-card p-4 md:gap-5 md:p-8 short:gap-4 short:p-6">
      <h2 className="bg-[image:var(--gradient-primary)] bg-clip-text font-display text-[24px] leading-none text-transparent md:text-[32px]">
        {t('heading')}
      </h2>

      <div className="flex flex-col gap-4 short:gap-3">
        {FEATURE_KEYS.map((key) => (
          <div key={key} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0">
              <h3 className="bg-[image:var(--gradient-primary)] bg-clip-text text-base font-bold text-transparent">
                {t(`features.${key}.title`)}
              </h3>
              <p className="text-base font-medium text-muted-foreground">
                {t(`features.${key}.body`)}
                {key === 'website' ? (
                  <>
                    {' '}
                    {EXAMPLE_PROFILE_URL ? (
                      <a
                        href={EXAMPLE_PROFILE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={SEE_EXAMPLE_CLASSNAME}
                      >
                        {t('features.website.cta')}
                      </a>
                    ) : (
                      <NotYetAvailable feature="exampleProfile" className="inline align-baseline">
                        <span className={SEE_EXAMPLE_CLASSNAME}>{t('features.website.cta')}</span>
                      </NotYetAvailable>
                    )}
                  </>
                ) : null}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
