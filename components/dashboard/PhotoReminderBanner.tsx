import { ImageOff } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { GuardedLink } from '@/components/dashboard/GuardedLink';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export type PhotoReminderBannerProps = {
  /** `profiles.avatar_url` — presence alone matters here, same as everywhere else this column
   * is read (`CabinetHeader`, `AvatarUpload`). */
  hasPhoto: boolean;
  /** `profiles.photo_requirement_waived` (Release-1 F4) — staff-only escape hatch for public
   * figures who intentionally have no avatar; lifts this reminder even without a photo. */
  photoRequirementWaived: boolean;
};

/**
 * Persistent "no photo" reminder — Release-1 F4 ("Плюс... постійне нагадування в кабінеті").
 * Product-owner decision: a standing banner at the top of the cabinet, not a mark on the
 * profile card, and NOT dismissible ("постійне нагадування" — it reappears every visit, same as
 * the client's own wording implies). Renders on every `/dashboard/**` screen (mounted once in
 * the cabinet layout, same place as `CabinetHeader`) and disappears the moment either condition
 * below stops holding — a photo gets uploaded, or staff grants the waiver.
 *
 * Deliberately does NOT restate the exact wording already shown under the photo field itself
 * (`auth.memberProfile.photo.requirements`, Release-1 F3) — this is a shorter, cabinet-wide
 * nudge with its own copy, not a duplicate.
 *
 * `Alert`'s neutral `default` variant (not `destructive`): a missing photo is an incomplete
 * profile, not an error state — same precedent as `LinkExpiredForm`'s own informational
 * `<Alert>` (no `variant` prop).
 */
export async function PhotoReminderBanner({
  hasPhoto,
  photoRequirementWaived,
}: PhotoReminderBannerProps) {
  if (hasPhoto || photoRequirementWaived) return null;

  const t = await getTranslations('dashboard.photoReminder');

  return (
    <Alert>
      <ImageOff aria-hidden="true" />
      <AlertTitle>{t('title')}</AlertTitle>
      <AlertDescription>
        <p>{t('body')}</p>
        <GuardedLink href="/dashboard/profile/hero" className="font-medium text-primary underline">
          {t('cta')}
        </GuardedLink>
      </AlertDescription>
    </Alert>
  );
}
