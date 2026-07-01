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
    <footer className="rounded-t-3xl bg-card px-4 pt-8 pb-4 sm:px-6 lg:rounded-t-[2.5rem] lg:px-16 lg:py-20">
      <div className="mx-auto flex max-w-large flex-col gap-12 lg:flex-row lg:justify-between lg:gap-8">
        <div className="flex flex-col gap-6 lg:max-w-[500px]">
          <Link href="/" className="font-display text-2xl leading-none text-primary lg:text-l">
            {tNav('brand')}
          </Link>
          <p className="text-body text-foreground">{t('newsletter.subtitle')}</p>
          <NewsletterForm />
        </div>

        <div className="flex flex-col gap-10 sm:flex-row sm:gap-16 lg:gap-20">
          <FooterColumn title={t('columns.one.title')} links={columnOneLinks} />
          <FooterColumn title={t('columns.two.title')} links={columnTwoLinks} />

          <div className="flex flex-col gap-6">
            <h3 className="text-sm font-bold text-primary">{t('social.title')}</h3>
            <ul className="flex flex-col gap-2">
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

      <div className="mx-auto mt-12 max-w-large lg:mt-16">
        <div className="border-t border-border" />
        <div className="flex flex-col gap-4 pt-4 text-tiny text-foreground sm:flex-row sm:items-center sm:justify-between sm:pt-8">
          <span>
            &copy; {year} {tNav('brand')}. {t('rights')}
          </span>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
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
    <div className="flex flex-col gap-6">
      <h3 className="text-sm font-bold text-primary">{title}</h3>
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
