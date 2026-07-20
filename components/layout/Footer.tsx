import { getTranslations } from 'next-intl/server';

import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  XIcon,
  YoutubeIcon,
} from '@/components/icons/social-icons';
import { Link } from '@/i18n/navigation';

import { NewsletterForm } from './NewsletterForm';

const SOCIAL_LINKS = [
  { key: 'facebook', Icon: FacebookIcon, href: 'https://facebook.com' },
  { key: 'instagram', Icon: InstagramIcon, href: 'https://instagram.com' },
  { key: 'x', Icon: XIcon, href: 'https://x.com' },
  { key: 'linkedin', Icon: LinkedinIcon, href: 'https://linkedin.com' },
  { key: 'youtube', Icon: YoutubeIcon, href: 'https://youtube.com' },
] as const;

/**
 * Primary site footer — Figma "Footer / 1 /" (Welcome Screen, desktop + mobile). Server
 * Component; the only client island is the newsletter email form.
 *
 * The column link labels ("Column One" / "Link One"…"Link Ten") and social profile URLs are
 * placeholder content carried over from the design file (a Relume template) — there's no
 * real sitemap/social presence yet to link to. They render as real navigation (pointing at
 * `/` for internal placeholders) so the layout/spacing is correct; swap in the actual
 * pages/URLs once they exist.
 */
export default async function Footer() {
  const t = await getTranslations('footer');
  const tNav = await getTranslations('nav');
  const year = new Date().getFullYear();

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
            <Link href="/" className="transition-colors hover:text-primary">
              {t('legal.privacy')}
            </Link>
            <Link href="/" className="transition-colors hover:text-primary">
              {t('legal.terms')}
            </Link>
            <Link href="/" className="transition-colors hover:text-primary">
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
