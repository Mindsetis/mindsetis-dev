import { ChevronRight } from 'lucide-react';

import { SECTION_ICONS, SectionPlusIcon } from '@/components/icons/profile-section-icons';
import { Link } from '@/i18n/navigation';
import type { ProfileSectionKey } from '@/lib/profile/completeness';

/**
 * One row in the "My Profile" section list (Figma `610:4227` Mindsetter / `708:9070` Member).
 *
 * The whole card is the link — the trailing "+" is decorative affordance, not a second target, so
 * there's exactly one tab stop and one click area per section (the Figma frame draws a button
 * there, but a nested interactive element inside a link is both an a11y problem and a worse
 * pointer target than the full-width card).
 */
export type ProfileSectionCardProps = {
  sectionKey: ProfileSectionKey;
  href: string;
  title: string;
  /** Preview line under the title — a static field list for Hero/Social links, a data-derived
   * summary ("3 added · Founder, Entrepreneur") for the rest. Resolved by the page. */
  summary: string;
};

export function ProfileSectionCard({ sectionKey, href, title, summary }: ProfileSectionCardProps) {
  const Icon = SECTION_ICONS[sectionKey];

  return (
    // `rounded-xl` is this project's exact 16px token (`--radius-xl`, radius.css); `bg-card` is
    // the exact #1a1a1a token. `border-[#2a2a2a]` has no matching token (arbitrary, same as the
    // sidebar's divider line elsewhere). `hover:bg-[#242424]` replaces the old
    // `hover:bg-white/[0.06]`: that computed DARKER than the new solid `bg-card` (white-alpha
    // composites against the page's black behind it, not against this card's own now-opaque
    // background), which inverted the intended "hover lightens" effect — `#242424` is the
    // design's own documented hover-tint swatch (Figma variable audit, "grey hover").
    // `gap-3.5` is this project's exact 14px token (Tailwind's stock spacing scale), the gap
    // between the icon and the title/summary column.
    // Mobile (Figma `1001:8330`): 12px radius, 16px padding, a 24px icon and a trailing chevron —
    // the card is a navigation row there rather than the desktop's larger "add to this section"
    // tile. No border either: the frame's cards sit on the page background with fill alone.
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[12px] bg-card p-4 transition-colors lg:gap-3.5 lg:rounded-xl lg:border lg:border-[#2a2a2a] lg:p-6 lg:hover:bg-[#242424]"
    >
      <Icon className="size-6 shrink-0 text-primary lg:size-[50px]" aria-hidden="true" />

      <span className="flex min-w-0 flex-1 flex-col gap-[3px] lg:gap-1">
        <span className="text-base font-medium text-foreground lg:font-display lg:text-[22px] lg:font-normal">
          {title}
        </span>
        <span className="text-tiny text-muted-foreground">{summary}</span>
      </span>

      {/* Chevron on mobile, the "+" chip from `lg` — two different affordances the two frames
          draw, not one scaled. */}
      <ChevronRight
        aria-hidden="true"
        className="size-[18px] shrink-0 text-muted-foreground lg:hidden"
      />

      {/* `border-border` is this project's exact #747474 token (`--color-border`, colors.css).
          `rounded-[11px]`/`bg-[#2a2a2a]` have no matching token (11px falls between the `md`/`lg`
          radius steps; #2a2a2a is the same one-off divider color used elsewhere in the cabinet).
          `opacity-90` is the stock Tailwind step for 0.9. */}
      <span
        aria-hidden="true"
        className="hidden size-9 shrink-0 items-center justify-center rounded-[11px] border border-border bg-[#2a2a2a] opacity-90 lg:flex"
      >
        <SectionPlusIcon className="size-[17px]" />
      </span>
    </Link>
  );
}
