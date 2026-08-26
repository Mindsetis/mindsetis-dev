import { ArrowLeft, ChevronLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { SectionPreviewHint } from '@/components/dashboard/SectionPreviewHint';
import { SECTION_ICONS } from '@/components/icons/profile-section-icons';
import { Link } from '@/i18n/navigation';
import { loadCabinetProfile } from '@/lib/profile/cabinet';
import type { ProfileSectionKey } from '@/lib/profile/completeness';

/**
 * Chrome shared by every `/dashboard/profile/*` section editor — the "← All sections" back link
 * plus the titled card the form sits in (Figma `613:4445` and its eleven siblings).
 *
 * The heading repeats the SAME icon the section's card shows in the list (`SECTION_ICONS`), so
 * opening a card keeps its identity rather than dropping to a bare title — 48px here vs 50px on
 * the card, which is the designer's own pair of sizes, not a rounding of one value.
 *
 * Deliberately NOT `BlockShell` (the onboarding block chrome): that one renders wizard furniture —
 * a step counter and a Back link pointing at the previous BLOCK — which is meaningless here, where
 * sections are independent and reached in any order. The forms inside are shared; only the frame
 * around them differs.
 */
export type SectionEditorShellProps = {
  /** Picks the heading icon from the shared section-key → icon map. */
  sectionKey: ProfileSectionKey;
  title: string;
  /** Short explainer under the heading; omitted for sections whose form is self-explanatory. */
  description?: string;
  children: ReactNode;
};

export async function SectionEditorShell({
  sectionKey,
  title,
  description,
  children,
}: SectionEditorShellProps) {
  const t = await getTranslations('dashboard.profile');
  const Icon = SECTION_ICONS[sectionKey];

  // Read here rather than threading a prop through all twelve section pages: `loadCabinetProfile`
  // is `cache`d per request and every one of those pages has already called it, so this costs
  // nothing. Only the Hero preview differs by account type, but the shell is the single place that
  // renders the ⓘ. Falling back to 'member' is unreachable in practice — each page redirects to
  // /login when the cabinet is null — and it keeps the shell from needing a null branch.
  const cabinet = await loadCabinetProfile();

  return (
    // `gap-8` (32px) — this column has exactly two children, the back link and the section card,
    // so the gap IS the spacing between them.
    <div className="flex flex-col gap-8">
      {/* Two different glyphs, not one scaled: the mobile frame draws a chevron, the desktop one
          an arrow. Weight follows suit — 16px Medium on a phone, bold on desktop. */}
      <Link
        href="/dashboard/profile"
        className="inline-flex w-fit items-center gap-2 text-base font-medium text-foreground hover:text-primary lg:font-bold"
      >
        <ChevronLeft className="size-[18px] lg:hidden" aria-hidden="true" />
        <ArrowLeft className="hidden size-4 lg:inline" aria-hidden="true" />
        {t('allSections')}
      </Link>

      {/* Same surface treatment as the section CARDS on the list (`ProfileSectionCard`): 16px
          radius (`rounded-xl` == `--radius-xl`), the exact #1a1a1a token, and the one-off
          #2a2a2a divider colour that has no token. Padding is 28px here vs the cards' 24px —
          the designer's own pair, not a rounding of one value. */}
      {/* `gap-5` (20px) is the space between the icon+title header row and the form below it —
          this column has exactly those two children, so the gap IS that spacing. */}
      {/* No card below `lg`: the mobile frames put the heading and the form straight on the page
          background, with each repeating item (a role, a superpower) carrying its own card
          instead. Wrapping everything in one more panel there would nest cards inside cards. */}
      <section className="flex flex-col gap-5 lg:rounded-xl lg:border lg:border-[#2a2a2a] lg:bg-card lg:p-7">
        {/* A grid, not a flex row, because the two layouts differ in more than size: on mobile the
            description starts at the left edge (row 2, spanning both columns), while on desktop it
            sits beside the icon in the text column with the icon spanning both rows. One DOM, two
            placements — cheaper than rendering the description twice. */}
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-1 lg:gap-x-3.5">
          <Icon className="size-[26px] shrink-0 text-primary lg:row-span-2 lg:size-12" />

          {/* `gap-2` = the requested 8px between the title and the info glyph. The glyph is desktop
              only — no mobile frame draws it, and its 520px preview panel has nowhere to go on a
              phone. */}
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="font-display text-[24px] text-foreground lg:text-[22px]">{title}</h2>
            <span className="hidden lg:inline-flex">
              <SectionPreviewHint
                sectionKey={sectionKey}
                accountType={cabinet?.accountType ?? 'member'}
              />
            </span>
          </div>

          {description ? (
            <p className="col-span-2 text-tiny text-muted-foreground lg:col-span-1 lg:col-start-2">
              {description}
            </p>
          ) : null}
        </div>

        {children}
      </section>
    </div>
  );
}
