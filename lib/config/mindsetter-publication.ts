import 'server-only';

/**
 * Whether a Mindsetter's public page (`/mindsetters/<username>`) is published automatically the
 * moment they become a Mindsetter — i.e. when the required onboarding steps are saved
 * (`promoteIfCoreWizardDone`, `app/[locale]/(app)/mindsetter-onboarding/actions.ts`).
 *
 * Owner's decision, 06.11.2026: the spec publishes a page only after staff verification, but there
 * is no back office to verify or publish anyone yet, so every Mindsetter page stayed invisible.
 * Until the admin panel exists, pages go live on promotion — WITHOUT the "Verified" badge
 * (`verification_status` is untouched) and without unlocking anything the permission matrix ties
 * to verification (booking, events, invites). Staff can still unpublish a page
 * (`mindsetter_profiles.is_public`), and it is only ever set at the member → mindsetter flip, so a
 * later save never re-publishes a page staff took down.
 *
 * ON unless `MINDSETTER_AUTO_PUBLISH` is exactly `false` — the switch to go back to
 * "published after verification" without a code change (redeploy to apply). When the back office
 * lands this moves into the admin settings like the other module switches.
 */
export function isMindsetterAutoPublishEnabled(): boolean {
  return process.env.MINDSETTER_AUTO_PUBLISH?.trim().toLowerCase() !== 'false';
}
