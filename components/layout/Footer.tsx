import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import type { ComponentType, SVGProps } from 'react';

import {
  InstagramIcon,
  LinkedinIcon,
  ThreadsIcon,
  YoutubeIcon,
} from '@/components/icons/social-icons';
import { NotYetAvailable, type NotYetAvailableFeature } from '@/components/ui/not-yet-available';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { FooterSoon } from './FooterSoon';
import { NewsletterForm } from './NewsletterForm';

/** The one real support address in the codebase (also used by `AlreadyAppliedModal` and the email
 * layout) — the footer's "Contact Us" opens a mail to it. */
const SUPPORT_EMAIL = 'support@mindsetis.com';

/**
 * Social networks in the design (Figma `1189:6332` "Frame 276": LinkedIn, Instagram, Threads,
 * YouTube — the design file also carries a hidden Facebook box that is NOT rendered).
 *
 * `href` is `null` for ALL of them: there is no real Mindsetis profile URL anywhere in the code or
 * the design (the old template shipped `https://facebook.com`-style placeholders, which linked
 * every visitor to the networks' home pages). Until a URL is set here the icon opens an
 * explanatory popup (`FooterSoon`) instead of linking nowhere; set the URL and it becomes a real
 * `target="_blank"` link with no other change. Never put a guessed handle in.
 */
const SOCIAL_LINKS: readonly {
  key: 'linkedin' | 'instagram' | 'threads' | 'youtube';
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  href: string | null;
}[] = [
  { key: 'linkedin', Icon: LinkedinIcon, href: null },
  { key: 'instagram', Icon: InstagramIcon, href: null },
  { key: 'threads', Icon: ThreadsIcon, href: null },
  { key: 'youtube', Icon: YoutubeIcon, href: null },
];

/**
 * What a footer entry does when clicked:
 *   - `route`   — a page that exists.
 *   - `mail`    — a `mailto:` to an address that exists.
 *   - `feature` — the page isn't built; the EXISTING `NotYetAvailable` popup with a feature whose
 *                 copy already describes it.
 *   - `soon`    — the page isn't built and no `NotYetAvailable` feature describes it; the footer's
 *                 own `FooterSoon` popup (see that file).
 */
type FooterItem =
  | { key: string; kind: 'route'; href: '/' | '/join' }
  | { key: string; kind: 'mail'; href: string }
  | { key: string; kind: 'feature'; feature: NotYetAvailableFeature }
  | { key: string; kind: 'soon' };

/** Albina's three link columns (Figma `572:5445`, `572:5458`, `1189:6377`), in the design's order. */
const COLUMNS: readonly { key: 'platform' | 'company' | 'membership'; items: FooterItem[] }[] = [
  {
    key: 'platform',
    items: [
      { key: 'home', kind: 'route', href: '/' },
      { key: 'catalog', kind: 'feature', feature: 'exploreCommunity' },
      { key: 'events', kind: 'feature', feature: 'events' },
    ],
  },
  {
    key: 'company',
    items: [
      { key: 'about', kind: 'soon' },
      { key: 'faqs', kind: 'soon' },
      { key: 'contact', kind: 'mail', href: `mailto:${SUPPORT_EMAIL}` },
    ],
  },
  {
    key: 'membership',
    items: [
      // `/join` is what every "Apply to Join" CTA on the site points to.
      { key: 'becomeMember', kind: 'route', href: '/join' },
      { key: 'becomeMindsetter', kind: 'feature', feature: 'learnMore' },
      { key: 'guidelines', kind: 'soon' },
    ],
  },
];

/** A link row: 16px/22px, 8px vertical padding (Figma `Link` frames are 38px tall). */
const LINK_CLASS =
  'block w-full py-2 text-left text-body leading-[22px] text-foreground transition-colors hover:text-primary';

/** A 32x32 social box (Figma `1189:6333`): `#1a1a1a` fill, 1px `grey border` stroke, radius 8. */
const SOCIAL_BOX_CLASS =
  'flex size-8 items-center justify-center rounded-[8px] border border-border bg-card text-foreground transition-colors hover:border-foreground';

type FooterProps = {
  /**
   * `'full'` (default) — newsletter form, social icons, three link columns and the credits row,
   * used everywhere via `app/[locale]/(app)/layout.tsx`. `'minimal'` — just the "Credits" row
   * (logo + copyright), used by the coming-soon homepage placeholder (stage 1.11, ROADMAP), which
   * sits outside the `(app)` route group and renders its own chrome.
   */
  variant?: 'full' | 'minimal';
  /** Extra classes for the outer `<footer>` — e.g. the homepage placeholder's overlap offset. */
  className?: string;
};

/**
 * Primary site footer — Albina's design ("Правки 3.0" П13): desktop "Footer / 1 /" (`1706:26218`,
 * 1440 wide) and mobile "Footer mobile / 1 /" (`1780:37290`, 375 wide). Server Component; the
 * client islands are the newsletter form and the "not live yet" popups.
 *
 * This REPLACES the Relume template footer (placeholder "Column One/Two" links all pointing at
 * `/`, placeholder social URLs, a "Follow Us" column) that the Figma file used to carry — the
 * template must not be ported, see docs/mindsetter-extended-onboarding.md.
 *
 * LAYOUT. Two layouts, as drawn: stacked (mobile) and two-column (desktop: newsletter + social on
 * the left 500px, three 170px link columns on the right). The design has no tablet frame, so the
 * switch is at `xl` (1280px) — the earliest width where the 1300px content area still fits both
 * halves; below it the stacked layout is used, with the three link columns side by side from `sm`
 * (rather than one long column) so a tablet isn't a phone-layout stretched to 800px.
 * Differences between the two frames, both kept: the newsletter headline exists on mobile only,
 * and the consent line is white on mobile / grey on desktop.
 *
 * LINKS. Of the nine entries only Home, Become a Member (→ `/join`) and Contact Us (→ `mailto:`)
 * have a destination. The rest are unbuilt pages and explain themselves in a popup instead of
 * linking to `/` — see `COLUMNS` and `FooterSoon`. The legal row points at the three real legal
 * pages; labels are unchanged from Figma ("Terms of Service" while the page is titled "Terms of
 * Use" — the mismatch is in the design itself, left as drawn). "Cookies Settings" opens the
 * Cookies Policy page, where the consent dialog lives (2026-09-02, customer request).
 *
 * `minimal` is a different, older design — the coming-soon stub's own Credits-only footer
 * (`829:4803` desktop, `866:5531` mobile) — checked against it in this pass.
 */
export default async function Footer({ variant = 'full', className }: FooterProps) {
  const tNav = await getTranslations('nav');
  const year = new Date().getFullYear();

  const t = await getTranslations('footer');

  if (variant === 'minimal') {
    // Figma `829:4803` (desktop) / `866:5531` (mobile): logo left, "© 2026 Mindsetis. All rights
    // reserved." right, on ONE line at 14px at both sizes (this used to force a `<br>` and drop to
    // 12px on mobile). 50px vertical / 64px horizontal padding on desktop, 24px / 16px on mobile.
    return (
      <footer
        className={cn(
          'rounded-t-[30px] bg-card px-4 py-6 sm:px-6 lg:rounded-t-[50px] lg:px-16 lg:py-[50px]',
          className,
        )}
      >
        <div className="mx-auto flex max-w-large flex-row items-center justify-between gap-4 text-sm text-foreground">
          <Link href="/" className="font-display text-2xl leading-none text-primary lg:text-l">
            {tNav('brand')}
          </Link>
          <span className="text-right">
            &copy; {year} {tNav('brand')}. {t('rights')}
          </span>
        </div>
      </footer>
    );
  }

  return (
    <footer className={cn('rounded-t-[30px] bg-card lg:rounded-t-[50px]', className)}>
      {/* Bottom padding clears the fixed "TO TOP" pill (`ScrollToTopButton`: 54px tall, 16px from
          the bottom, 24px from `md`), which otherwise sat on the credits row's links — "Cookies
          Settings" was only clickable on its left half. Deeper than the frames' 16/32px on
          purpose. */}
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-8 pb-[78px] sm:px-6 md:pb-[86px] lg:px-[70px] lg:pt-[70px]">
        <div className="flex flex-col gap-8 xl:flex-row xl:justify-between">
          {/* Newsletter + social. Vertical rhythm from the frames: logo → form 24px (mobile, with the
              headline between) / 32px (desktop); consent → social 16px / 32px. */}
          <div className="flex w-full max-w-[500px] flex-col xl:shrink-0">
            <Link
              href="/"
              aria-label={tNav('brand')}
              className="mb-6 inline-flex self-start xl:mb-8"
            >
              {/* Figma `1706:32075` "Frame 842", exported as SVG (text outlined, gradient kept) —
                  the icon mark + gradient wordmark, 178.5x32 at both sizes; icon rescaled to the "M" cap height (client edit 03.11.2026). */}
              <Image
                src="/images/brand/mindsetis-logo.svg"
                alt=""
                width={179}
                height={32}
                className="h-8 w-auto"
              />
            </Link>

            <p className="mb-4 text-base font-bold text-foreground xl:hidden">
              {t('newsletter.subtitle')}
            </p>

            <NewsletterForm />

            <ul className="mt-4 flex flex-row gap-3 xl:mt-8">
              {SOCIAL_LINKS.map(({ key, Icon, href }) => (
                <li key={key}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t(`social.${key}`)}
                      className={SOCIAL_BOX_CLASS}
                    >
                      <Icon className="size-4" />
                    </a>
                  ) : (
                    <FooterSoon
                      kind="social"
                      label={t(`social.${key}`)}
                      ariaLabel={t(`social.${key}`)}
                      className={cn(SOCIAL_BOX_CLASS, 'cursor-pointer')}
                    >
                      <Icon className="size-4" />
                    </FooterSoon>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <nav
            aria-label={t('nav.ariaLabel')}
            className="flex flex-col gap-6 sm:grid sm:grid-cols-3 sm:gap-10 xl:w-[590px] xl:shrink-0"
          >
            {COLUMNS.map((column) => (
              <div key={column.key} className="min-w-0">
                {/* Title: 16px bold in the shared "gradient / brand" paint — the same
                    `--gradient-primary` token the app's other gradient text uses. 8px to the first
                    link on mobile, 16px on desktop (the frames' 30px / 38px link offsets). */}
                <h3 className="mb-2 bg-[image:var(--gradient-primary)] bg-clip-text text-base font-bold text-transparent xl:mb-4">
                  {t(`nav.${column.key}.title`)}
                </h3>
                <ul className="flex flex-col">
                  {column.items.map((item) => {
                    const label = t(`nav.${column.key}.items.${item.key}`);
                    return (
                      <li key={item.key}>
                        {item.kind === 'route' ? (
                          <Link href={item.href} className={LINK_CLASS}>
                            {label}
                          </Link>
                        ) : item.kind === 'mail' ? (
                          <a href={item.href} className={LINK_CLASS}>
                            {label}
                          </a>
                        ) : item.kind === 'feature' ? (
                          <NotYetAvailable feature={item.feature} className="w-full">
                            <span className={LINK_CLASS}>{label}</span>
                          </NotYetAvailable>
                        ) : (
                          <FooterSoon kind="page" label={label} className={LINK_CLASS}>
                            {label}
                          </FooterSoon>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Credits: divider, then — 4px below it on mobile / 32px on desktop — the copyright and
            the legal links (stacked 8px apart on mobile, one row on desktop). 32px / 70px below
            the content block. */}
        <div className="mt-8 lg:mt-[70px]">
          <div className="border-t border-border" />
          <div className="flex flex-col gap-2 pt-1 text-tiny sm:flex-row sm:items-center sm:justify-between sm:pt-8">
            <span className="text-muted-foreground">
              &copy; {year} {tNav('brand')}. {t('rights')}
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-foreground sm:gap-x-6">
              <Link
                href="/privacy-policy"
                className="underline transition-colors hover:text-primary"
              >
                {t('legal.privacy')}
              </Link>
              <Link href="/terms-of-use" className="underline transition-colors hover:text-primary">
                {t('legal.terms')}
              </Link>
              {/* "Cookies Settings" (Figma label, unchanged) navigates to the Cookies Policy
                  document, like the two links beside it. It briefly opened the preferences dialog
                  instead (2026-09-01) and was changed back on 2026-09-02 at the customer's request.
                  The dialog is still reachable — `CookieSettingsTrigger` now lives on that page. */}
              <Link
                href="/cookies-policy"
                className="underline transition-colors hover:text-primary"
              >
                {t('legal.cookies')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
