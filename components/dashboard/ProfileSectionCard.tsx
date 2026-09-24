import { getTranslations } from 'next-intl/server';

import { EditPencilIcon } from '@/components/icons/cabinet-header-icons';
import { SECTION_ICONS } from '@/components/icons/profile-section-icons';
import { Link } from '@/i18n/navigation';
import type { ProfileSectionKey } from '@/lib/profile/completeness';

/**
 * One row in the "My Profile" section list (Figma `610:4227` Mindsetter / `708:9070` Member).
 *
 * The whole card is the link — the trailing chip is decorative affordance, not a second target, so
 * there's exactly one tab stop and one click area per section (the Figma frame draws a button
 * there, but a nested interactive element inside a link is both an a11y problem and a worse
 * pointer target than the full-width card).
 *
 * THE CHIP ITSELF IS `pointer-events-none` (2026-09-19, Release-1 C2 bugfix). Its icon used to be a
 * bare "+" glyph inside a fixed 36px circle, and a click landing exactly on the glyph's own SVG
 * paths did not always reach the card: an inline `<svg>`'s un-painted pixels use
 * `pointer-events: visiblePainted` by default, so a click there is only guaranteed to fall through
 * to an ANCESTOR that itself captures pointer events — normally the chip's own `span`, which this
 * project already gives an opaque background for exactly that reason, but the failure mode the
 * client hit (works "on the card/nearby", not "on the icon") is the textbook symptom of a
 * decorative glyph absorbing a pointer event it has no listener for instead of letting it fall all
 * the way through. `pointer-events-none` on the chip removes it from hit-testing entirely, so
 * every pixel inside it is unambiguously the surrounding `<Link>`'s — no reliance on which browser
 * happens to fall through an unpainted SVG region correctly. Swapping the glyph for the word "Edit"
 * (client's explicit choice, not a chevron/icon) also GROWS the hit area on its own: a text label is
 * wider than a 17px glyph, so the chip's padding scales with the copy instead of staying pinned to
 * an icon's fixed box.
 *
 * PENCIL ICON ADDED (2026-09-21, Release-1 C2 design reconciliation): the designer's later Admin
 * Panel mock (Figma node `610:4462` "Section card" → "Expand" chip, instance `Tertiary - small`,
 * `1494:25091`) draws the chip as a pencil glyph ("ball-pen-fill", 14×14) THEN the word "Edit", 5px
 * apart — not the bare word alone this component previously rendered. The word itself is unchanged
 * (still the client's explicit choice, not a chevron), so this is additive, not a reversal of the
 * decision above. `EditPencilIcon` (`cabinet-header-icons.tsx`) is reused rather than re-exporting
 * a third copy of the same path — it's already this exact glyph at this exact 14×14 grid, confirmed
 * by a direct node/path comparison against Figma's `ball-pen-fill` (the same shape `CabinetHeader`'s
 * "Edit" link already renders at the same size). The icon sits INSIDE the same `pointer-events-none`
 * chip, so the hit-target reasoning above is unaffected — nothing about it gained its own pointer
 * handling.
 */
export type ProfileSectionCardProps = {
  sectionKey: ProfileSectionKey;
  href: string;
  title: string;
  /** Preview line under the title — a static field list for Hero/Social links, a data-derived
   * summary ("3 added · Founder, Entrepreneur") for the rest. Resolved by the page. */
  summary: string;
};

export async function ProfileSectionCard({
  sectionKey,
  href,
  title,
  summary,
}: ProfileSectionCardProps) {
  const Icon = SECTION_ICONS[sectionKey];
  const t = await getTranslations('dashboard.profile');

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

      {/* `border-border` is this project's exact #747474 token (`--color-border`, colors.css).
          `rounded-[11px]`/`bg-[#2a2a2a]` have no matching token (11px falls between the `md`/`lg`
          radius steps; #2a2a2a is the same one-off divider color used elsewhere in the cabinet) —
          both measured off Figma's "Expand" chip frame (`610:4462`), which also confirms the exact
          36px height (`min-h-9`), 15px horizontal padding (`px-[15px]`, no matching token), 5px
          icon↔label gap (`gap-[5px]`), full-opacity white content (no `opacity-90` — Figma's fill
          is solid `#ffffff`, this project's own `text-foreground`) and Regular/400 weight (no
          `font-medium` — Figma's "Edit" label is Manrope Regular, not Medium). `pointer-events-none`
          — see the doc comment above: this chip must never be able to catch a click itself, only
          the `<Link>` around it. Shown at every width: Figma draws a trailing chevron on the mobile
          card instead, but C2's wording is explicit — the word "Edit", not a chevron — and the
          owner confirmed that reading on 2026-09-19, so the chevron is gone and this chip (now with
          its pencil icon) is the only affordance at every breakpoint. */}
      <span
        aria-hidden="true"
        className="pointer-events-none flex min-h-9 shrink-0 items-center gap-[5px] rounded-[11px] border border-border bg-[#2a2a2a] px-[15px] text-tiny text-foreground"
      >
        <EditPencilIcon className="shrink-0" />
        {t('edit')}
      </span>
    </Link>
  );
}
