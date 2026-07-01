import { setRequestLocale } from 'next-intl/server';

import { HeroSection } from '@/components/marketing/HeroSection';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Landing page — Figma "Welcome Screen - 1440 px" (desktop) / "Welcome Screen" (mobile),
 * Mindsetis design file. Header/Footer come from the shared locale layout; this renders the
 * hero section in between.
 */
export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HeroSection />;
}
