import { setRequestLocale } from 'next-intl/server';

import { HeroSection } from '@/components/marketing/HeroSection';
import { pageTitle } from '@/i18n/page-metadata';

type JoinPageProps = {
  params: Promise<{ locale: string }>;
};

// `home.hero.title` (the page's own on-screen heading) is a full marketing sentence — too long
// for a tab title — so this points at `metaTitle`, a short clean label instead, matching what
// every "Apply to Join" CTA across the site already calls this destination (`nav.join`).
export async function generateMetadata({ params }: JoinPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'home.hero', 'metaTitle');
}

/**
 * `/join` — the email-capture entry point every "Apply to Join" CTA on the site now points to
 * (Header's Join CTA, and the new homepage's own "Apply to Join"/"Apply for Ambassadorship"
 * CTAs — see `MainPageSection`'s subsections for why each one lands here).
 *
 * This route did not exist before: `HeroSection` (Figma "Welcome Screen - 1440 px" desktop /
 * "Welcome Screen" mobile — heading + email-capture form, `HeroEmailCta` → `/sign-up?email=…`)
 * used to render directly on `/` whenever `COMING_SOON_MODE` was off, before the real "Main
 * Page" homepage (`MainPageSection`) took that slot over. Moved here AS-IS (not rewritten) —
 * relocating where an unchanged component renders, not touching its internals — so it keeps
 * working as the actual join/sign-up funnel instead of being orphaned.
 *
 * Lives inside the `(app)` route group specifically so `(app)/layout.tsx` supplies the normal
 * full Header/Footer chrome for free, same as every other real route — unlike `/`, which sits
 * outside that group and has to render its own chrome (see that page's own doc comment for why).
 */
export default async function JoinPage({ params }: JoinPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HeroSection />;
}
