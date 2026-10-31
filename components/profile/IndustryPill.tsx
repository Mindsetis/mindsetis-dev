import { BriefcaseFillIcon } from '@/components/icons/briefcase-fill-icon';
import { cn } from '@/lib/utils';

import styles from './IndustryPill.module.css';

export interface IndustryPillProps {
  /** The small caps caption ("INDUSTRY"), already translated by the caller. */
  caption: string;
  /**
   * Display labels, ALREADY MODERATION-FILTERED by the page via `resolveIndustryLabels`
   * (`lib/profile/industry-labels.ts`) — the only industry data a profile view ever receives.
   * Empty = nothing to show: the pill renders nothing at all.
   */
  labels: string[];
  /** `light` for the white Member profile, `dark` for the Mindsetter page — see the CSS module. */
  theme: 'light' | 'dark';
  className?: string;
}

/**
 * The INDUSTRY pill: caption, a 1x12 divider, then the briefcase glyph and the picked industries
 * on one line. Shared by `MemberProfileView` and `MindsetterProfileView` so the two public
 * profiles can't drift apart.
 *
 * Figma ("Правки 3.0" П9, Albina) — the pill is drawn once per profile frame:
 *  · Member (light): `1642:23098` desktop (14px values) / `1751:38850` mobile variant (12px).
 *  · Mindsetter (dark): `1750:33840` ("Frame 785", inside the hero's "Tags" frame `1750:33839`
 *    of `327:1080`; every other desktop Mindsetter frame — `383:2070`, `383:2830`, `383:3590`,
 *    `383:4089`, `1612:25724`, `1653:26557` — carries a copy) and `1751:38858` inside "Tags"
 *    `1751:38857` of the mobile frame `401:7567` (`187:4294` has one too) — the same pill, no
 *    fill, white values.
 * All of them: 24px tall, radius 12, 12px side padding, 10px between the caption, the divider and
 * the icon+values group; caption 11px bold, 30% letter-spacing, `secondary text` #a5a5a5
 * (= `text-muted-foreground`). The 14px/12px value size is `text-tiny`'s own per-breakpoint step.
 *
 * `min-h-6` + `py-0.5` rather than a fixed height so three long values wrap onto a second line on
 * a narrow screen instead of overflowing or being truncated.
 */
export function IndustryPill({ caption, labels, theme, className }: IndustryPillProps) {
  if (labels.length === 0) return null;

  return (
    <span
      className={cn(
        'inline-flex min-h-6 max-w-full items-center gap-2.5 px-3 py-0.5',
        styles.pill,
        theme === 'dark' ? styles.dark : styles.light,
        className,
      )}
    >
      <span className="shrink-0 text-[11px] leading-[1.2] font-bold tracking-[0.3em] text-muted-foreground uppercase">
        {caption}
      </span>
      {/* Figma (both themes — SVG export of `1642:23098` and `1750:33840`): the divider is #a5a5a5
          at 50% opacity. The Member pill used to draw it at full opacity. */}
      <span aria-hidden="true" className="h-3 w-px shrink-0 bg-muted-foreground opacity-50" />
      {/* `leading-4`: `text-tiny`'s own 1.4 line-height made the pill 25.6px tall at desktop,
          1.6px taller than the 24px company/role pills beside it. */}
      <span className="inline-flex min-w-0 items-center gap-1 text-tiny leading-4">
        <BriefcaseFillIcon className="size-3.5 shrink-0 text-primary" />
        <span className="min-w-0">{labels.join(', ')}</span>
      </span>
    </span>
  );
}
