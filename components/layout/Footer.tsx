import { getTranslations } from 'next-intl/server';

import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  XIcon,
  YoutubeIcon,
} from '@/components/icons/social-icons';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { NewsletterForm } from './NewsletterForm';

const SOCIAL_LINKS = [
  { key: 'facebook', Icon: FacebookIcon, href: 'https://facebook.com' },
  { key: 'instagram', Icon: InstagramIcon, href: 'https://instagram.com' },
  { key: 'x', Icon: XIcon, href: 'https://x.com' },
  { key: 'linkedin', Icon: LinkedinIcon, href: 'https://linkedin.com' },
  { key: 'youtube', Icon: YoutubeIcon, href: 'https://youtube.com' },
] as const;

type FooterProps = {
  /**
   * `'full'` (default) — newsletter form, both link columns, social icons, and the
   * credits row, used everywhere via `app/[locale]/(app)/layout.tsx`. `'minimal'` — just the
   * "Credits" row (logo + copyright), used by the coming-soon homepage placeholder (stage
   * 1.11, ROADMAP), which sits outside the `(app)` route group and renders its own chrome.
   */
  variant?: 'full' | 'minimal';
  /** Extra classes for the outer `<footer>` — e.g. the homepage placeholder's overlap offset. */
  className?: string;
};

/**
 * Primary site footer — Figma "Footer / 1 /" (Welcome Screen, desktop + mobile). Server
 * Component; the only client island is the newsletter email form.
 *
 * The column link labels ("Column One" / "Link One"…"Link Ten") and social profile URLs are
 * placeholder content carried over from the design file (a Relume template) — there's no
 * real sitemap/social presence yet to link to. They render as real navigation (pointing at
 * `/` for internal placeholders) so the layout/spacing is correct; swap in the actual
 * pages/URLs once they exist.
 *
 * The `legal.*` row (2026-08-18) is NOT a placeholder — it points at the three real legal
 * pages (`/privacy-policy`, `/terms-of-use`, `/cookies-policy`, `LegalPage`/`legal/page.tsx`
 * files). Labels are unchanged from Figma ("Privacy Policy" / "Terms of Service" / "Cookies
 * Settings") even though the pages themselves are titled "Privacy Policy" / "Terms of Use" /
 * "Cookies Policy" — the footer's own Figma frame literally still says "Terms of Service" and
 * "Cookies Settings", not the page titles, so left as-is rather than "fixing" a mismatch that's
 * in the design itself.
 */
export default async function Footer({ variant = 'full', className }: FooterProps) {
  const tNav = await getTranslations('nav');
  const year = new Date().getFullYear();

  const t = await getTranslations('footer');

  if (variant === 'minimal') {
    // Figma `866:4842` "Footer / 1 /" (the Заглушка's own Credits-only footer): 50px vertical /
    // 64px horizontal padding — was missing a `lg:` vertical override (flat `py-8`/32px at every
    // breakpoint), unlike the `full` variant below (which uses its own distinct `lg:py-20`,
    // measured off a different, taller Figma frame that also has the newsletter/columns above
    // this same Credits row).
    return (
      <footer
        className={cn(
          'rounded-t-[30px] bg-card px-4 py-6 sm:px-6 lg:rounded-t-[50px] lg:px-16 lg:py-[50px]',
          className,
        )}
      >
        <div className="mx-auto flex max-w-large flex-row items-center justify-between gap-4 text-tiny text-foreground">
          <Link href="/" className="font-display text-2xl leading-none text-primary lg:text-l">
            {tNav('brand')}
          </Link>
          <span className="text-right">
            &copy; {year} {tNav('brand')}.
            <br />
            {t('rights')}
          </span>
        </div>
      </footer>
    );
  }

  const columnOneLinks = t.raw('columns.one.links') as string[];
  const columnTwoLinks = t.raw('columns.two.links') as string[];

  return (
    <footer className="rounded-t-[30px] bg-card px-4 pt-8 pb-4 sm:px-6 lg:rounded-t-[50px] lg:px-16 lg:py-20">
      <div className="mx-auto flex max-w-large flex-col gap-8 lg:flex-row lg:justify-between">
        <div className="flex flex-col lg:gap-6 lg:max-w-[500px] lg:shrink-0">
          <Link
            href="/"
            className="mb-6 font-display text-2xl leading-none text-primary lg:mb-0 lg:text-l"
          >
            {tNav('brand')}
          </Link>
          <p className="mb-4 text-body text-foreground lg:mb-0">{t('newsletter.subtitle')}</p>
          <NewsletterForm />
        </div>

        <div className="flex min-w-0 flex-col gap-4 sm:w-full sm:max-w-[652px] sm:flex-row sm:justify-between">
          <FooterColumn title={t('columns.one.title')} links={columnOneLinks} />
          <FooterColumn title={t('columns.two.title')} links={columnTwoLinks} />

          <div className="flex min-w-0 flex-col sm:w-[190px] sm:shrink">
            <h3 className="mb-2 text-sm font-bold text-primary md:mb-4">{t('social.title')}</h3>
            <ul className="flex flex-col">
              {SOCIAL_LINKS.map(({ key, Icon, href }) => (
                <li key={key}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 py-2 text-body text-foreground transition-colors hover:text-primary"
                  >
                    <Icon className="size-6" />
                    {t(`social.${key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-large lg:mt-[90px]">
        <div className="border-t border-border" />
        <div className="flex flex-col gap-2 pt-1 text-tiny text-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pt-8">
          <span>
            &copy; {year} {tNav('brand')}. {t('rights')}
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-x-6">
            <Link href="/privacy-policy" className="transition-colors hover:text-primary">
              {t('legal.privacy')}
            </Link>
            <Link href="/terms-of-use" className="transition-colors hover:text-primary">
              {t('legal.terms')}
            </Link>
            {/* "Cookies Settings" (Figma label, unchanged) points at the static Cookies Policy
                document — there's no interactive cookie-preference manager built yet (Figma has
                a separate "Manage Cookie Preferences" frame that isn't part of this task's
                scope), so this is the closest real destination rather than a dead `/`. */}
            <Link href="/cookies-policy" className="transition-colors hover:text-primary">
              {t('legal.cookies')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div className="flex min-w-0 flex-col sm:w-[190px] sm:shrink">
      <h3 className="mb-2 text-sm font-bold text-primary md:mb-4">{title}</h3>
      <ul className="flex flex-col">
        {links.map((label) => (
          <li key={label}>
            <Link
              href="/"
              className="block py-2 text-body text-foreground transition-colors hover:text-primary"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
