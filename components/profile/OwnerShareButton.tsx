import {
  ShareProfileButton,
  type ShareProfileButtonProps,
} from '@/components/profile/ShareProfileButton';
import { cn } from '@/lib/utils';

/**
 * The share control a profile's OWNER sees in place of "Invite to event" ("Правки 3.0" П11 for
 * Members, extended to Mindsetters 31.10; labelled 03.11 at the client's request: a bare square
 * icon was not understood). Same shape as the shared `Button` (rounded-lg, gap-3, 16px bold,
 * 16px glyph) so it can wear the Invite button's `.inviteButton` look; height, width and colours
 * come from the caller through `className`. Enabled, pointer cursor, visible "Share profile" text
 * that is also its accessible name.
 *
 * Server Component: only forwards props to the `'use client'` `ShareProfileButton` island.
 */
export function OwnerShareButton({ className, ...props }: ShareProfileButtonProps) {
  return (
    <ShareProfileButton
      {...props}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center gap-3 whitespace-nowrap rounded-lg text-base font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:size-4 [&_svg]:shrink-0',
        className,
      )}
    />
  );
}
