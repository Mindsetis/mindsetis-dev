import { useTranslations } from 'next-intl';

import { GoogleIcon, LinkedinBadgeIcon } from '@/components/icons/oauth-icons';
import { Button } from '@/components/ui/button';

/**
 * "Continue with Google" / "Continue with Linkedin" — Figma "Registration" (mobile
 * `165:2853`, `Frame 90` = node `401:7010`) / "Registration 1/4 - 1440 px" (desktop
 * `387:1725`, node `387:2135`): stacked full-width on mobile, side-by-side on desktop.
 *
 * OAuth deferred (see `app/[locale]/(auth)/actions.ts`) — both buttons are rendered for
 * visual fidelity only and are permanently `disabled`, not wired to any provider. No-op by
 * construction (no `onClick`/`formAction`); do not add fake auth here.
 *
 * Height: Figma has both buttons at a fixed 56px (`size="default"` = `h-14`) on mobile and
 * desktop. `md:flex-1` (not a bare `flex-1`) is deliberate — an unconditional `flex-1` on a
 * `flex-col` parent (mobile) sets `flex-basis: 0%` on the main axis, which is the *height*
 * in column mode, overriding `h-14` and collapsing the buttons to their content height.
 * Scoping the grow to `md:` (row layout, main axis = width) keeps equal-width desktop
 * buttons without touching mobile height; mobile full-width comes from the default
 * `align-items: stretch` cross-axis behavior of the parent flex container.
 */
export function OAuthButtons() {
  const t = useTranslations('auth');

  return (
    <div className="flex flex-col gap-2 md:flex-row">
      <Button
        type="button"
        variant="tertiary"
        size="default"
        disabled
        className="justify-center gap-3 border-foreground text-foreground disabled:border-foreground/40 disabled:text-foreground/40 md:flex-1"
      >
        {/* Button's base class forces all `svg` children to `size-4` (16px) for a
            consistent icon scale across the UI Kit — a deliberate, minor departure from
            the larger (~24px) raster logos in Figma, kept for cross-button consistency. */}
        <GoogleIcon />
        {t('signUp.continueWithGoogle')}
      </Button>
      <Button
        type="button"
        variant="tertiary"
        size="default"
        disabled
        className="justify-center gap-3 border-foreground text-foreground disabled:border-foreground/40 disabled:text-foreground/40 md:flex-1"
      >
        <LinkedinBadgeIcon />
        {t('signUp.continueWithLinkedin')}
      </Button>
    </div>
  );
}
