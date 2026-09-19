import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ProfileSectionCard } from '@/components/dashboard/ProfileSectionCard';
import { redirect } from '@/i18n/navigation';
import { pageTitle } from '@/i18n/page-metadata';
import { loadCabinetProfile, type SectionSummary } from '@/lib/profile/cabinet';
import type { ProfileSection } from '@/lib/profile/completeness';
import { MIN_REEL_LIFE_PHOTOS_TO_DISPLAY } from '@/lib/validation/mindsetter';

type DashboardProfilePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: DashboardProfilePageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'dashboard.profile');
}

/**
 * Cabinet → "My Profile": the list of editable sections (Figma `610:4227` Mindsetter, twelve
 * cards / `708:9070` Member, two cards). Each card links to its own editor route; nothing is
 * edited here.
 *
 * Per-section saving is the design's own rule ("each section is saved separately") and matches
 * what already exists server-side — the onboarding wizard's Server Actions are already one per
 * step, so the editors reuse them rather than introducing a single monolithic save.
 *
 * The section SET comes from `computeProfileCompleteness`, not from a list hardcoded here, so the
 * cards, the header's percentage, and the header's "Edit" target can never disagree about what
 * counts as a section or what order they're in.
 */
export default async function DashboardProfilePage({ params }: DashboardProfilePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard.profile');
  // Reel Life's empty card reuses the hint the EDITOR shows under its own upload field, rather
  // than a second sentence of its own (2026-08-11) — same copy, one key, so the two can't drift.
  const tReelLife = await getTranslations('mindsetterOnboarding.blocks.reelLife');

  const cabinet = await loadCabinetProfile();
  if (!cabinet) {
    redirect({ href: '/login', locale });
    return null;
  }

  /**
   * Builds a card's preview line.
   *
   * Hero and Social links show a STATIC field list (what the form actually contains) rather than a
   * data summary — that's what the Figma cards do, and it stays useful whether or not the section
   * is filled. Note the Figma copy for these two is stale: it advertises "cover" and "tagline",
   * neither of which exists in the form or is used anywhere in the app (verified 2026-08-10), so
   * the strings here list the real fields instead.
   */
  const summaryFor = (section: ProfileSection): string => {
    if (section.key === 'hero' || section.key === 'socialLinks') {
      return t(`sections.${section.key}.hint`);
    }

    if (!section.filled) {
      const empty =
        section.key === 'reelLife'
          ? tReelLife('recommendedHint', { count: MIN_REEL_LIFE_PHOTOS_TO_DISPLAY })
          : t(`sections.${section.key}.empty`);
      return section.optional ? t('optionalPrefix', { text: empty }) : empty;
    }

    const summary: SectionSummary = cabinet.summaries[section.key] ?? { count: 0, names: [] };
    const filled = t(`sections.${section.key}.filled`, { count: summary.count });
    // Up to three example labels, matching the Figma cards ("… · Founder, Entrepreneur, Speaker").
    // Sections whose items have no short label contribute none and show the count alone.
    return summary.names.length > 0
      ? `${filled} · ${summary.names.slice(0, 3).join(', ')}`
      : filled;
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline gap-3">
        {/* `text-m` is this project's exact 22px token (`--text-m`, typography.css);
            `font-normal` guarantees weight 400 rather than relying on inheritance. */}
        {/* 24px on the mobile frame ("MOB/H2"), 22px (`text-m`) on desktop. */}
        <h2 className="font-display text-[24px] font-normal text-foreground lg:text-m">
          {t('title')}
        </h2>
        <p className="text-tiny text-muted-foreground">
          {cabinet.accountType === 'mindsetter' ? t('subtitleMindsetter') : t('subtitleMember')}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {cabinet.completeness.sections.map((section) => (
          <ProfileSectionCard
            key={section.key}
            sectionKey={section.key}
            href={section.href}
            title={t(`sections.${section.key}.title`)}
            summary={summaryFor(section)}
          />
        ))}
      </div>
    </section>
  );
}
