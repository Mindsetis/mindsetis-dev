import {
  ShareProfileButton,
  type ShareProfileButtonProps,
} from '@/components/profile/ShareProfileButton';
import { cn } from '@/lib/utils';

/**
 * The share control a profile's OWNER sees in place of "Invite to event" / "Book a Session"
 * ("Правки 3.0" П11 for Members, extended to Mindsetters 31.10) — inviting or booking yourself
 * makes no sense, sharing your own page does.
 *
 * Owns the SHAPE only: a square 44x44 box (`size-11`, the minimum touch target for a tapped,
 * primary action) with a 20px glyph (`[&_svg]:size-5` overrides `ShareProfileButton`'s own
 * `size-4`) and 8px corners. The COLOURS come from the caller through `className`, because the
 * Member profile is a light page (`MemberProfileView.module.css` `.socialIconButton`, light gray)
 * and the Mindsetter profile is a dark one (`MindsetterProfileView.module.css`
 * `.socialIconButton`, `--color-card` + `--color-border`). Keeping the shape in one place stops
 * the two owner views drifting apart.
 *
 * NOT FROM THE DESIGN: Figma draws no Share control in this slot on any profile frame — the size
 * and placement are developer decisions, to be replaced once Albina draws it.
 *
 * Server Component: only forwards props to the `'use client'` `ShareProfileButton` island.
 */
export function OwnerShareButton({ className, ...props }: ShareProfileButtonProps) {
  return (
    <ShareProfileButton
      {...props}
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5',
        className,
      )}
    />
  );
}
