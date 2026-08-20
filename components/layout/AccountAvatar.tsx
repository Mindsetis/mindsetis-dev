import { cn } from '@/lib/utils';

export type AccountAvatarProps = {
  avatarUrl: string | null;
  /** Drives the fallback initial; never rendered as text when a photo exists. */
  displayName: string;
  className?: string;
};

/**
 * The signed-in user's avatar as the header renders it — shared by the desktop dropdown trigger
 * and the mobile sheet (both in `AccountMenu`) plus the sheet's own header row, so the photo and
 * its no-photo fallback can't drift between them.
 *
 * Size comes from the caller (`className`), since the three call sites want three different ones:
 * 43px on phones and 48px from `lg` for the trigger, a flat 48px inside the sheet.
 *
 * The design only ever draws a photo, and its empty-state fill is a bare white circle. A white
 * disc with no content would read as a rendering bug, so the fallback carries the account's
 * initial instead — the same information, legibly.
 */
export function AccountAvatar({ avatarUrl, displayName, className }: AccountAvatarProps) {
  if (avatarUrl) {
    return (
      // Plain <img>, matching how every other surface renders `profiles.avatar_url`
      // (CabinetHeader, AvatarUpload, MemberProfileView).
      //
      // `block` so the image never sits on the text baseline: the header trigger passes
      // `size-full`, which masks the difference, but `AccountSheet`'s row passes a fixed
      // `size-12` — there an inline image would add descender space below itself and push the
      // row's own centring off. The fallback below is a flex `<span>` and never had this.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt="" className={cn('block rounded-full object-cover', className)} />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center rounded-full bg-white/10 text-base font-bold text-foreground',
        className,
      )}
    >
      {displayName.trim().charAt(0).toUpperCase()}
    </span>
  );
}
