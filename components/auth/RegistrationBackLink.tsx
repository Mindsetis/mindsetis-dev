import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type RegistrationBackLinkProps = {
  href: string;
  label: string;
  /** Overrides the default `md:absolute` centering trick — the mindsetter-onboarding flow's
   * Back-link wrapper has no sibling progress bar to center against (unlike the 4-step Member
   * wizard's `RegistrationStepHeader`), so those callers pass `md:static md:translate-y-0` here
   * instead, letting the link sit in normal flow. */
  className?: string;
};

function BackArrowIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12.71 17.7141C12.8037 17.6211 12.8781 17.5105 12.9289 17.3887C12.9797 17.2668 13.0058 17.1361 13.0058 17.0041C13.0058 16.8721 12.9797 16.7414 12.9289 16.6195C12.8781 16.4977 12.8037 16.3871 12.71 16.2941L9.41 13.0041L17 13.0041C17.2652 13.0041 17.5196 12.8987 17.7071 12.7112C17.8946 12.5237 18 12.2693 18 12.0041C18 11.7389 17.8946 11.4845 17.7071 11.297C17.5196 11.1094 17.2652 11.0041 17 11.0041L9.41 11.0041L12.71 7.71409C12.8983 7.52579 13.0041 7.27039 13.0041 7.00409C13.0041 6.73779 12.8983 6.4824 12.71 6.29409C12.5217 6.10579 12.2663 6 12 6C11.7337 6 11.4783 6.10579 11.29 6.29409L6.29 11.2941C6.19896 11.3892 6.12759 11.5013 6.08 11.6241C6.0271 11.7438 5.99977 11.8732 5.99977 12.0041C5.99977 12.135 6.0271 12.2644 6.08 12.3841C6.12759 12.5068 6.19896 12.619 6.29 12.7141L11.29 17.7141C11.383 17.8078 11.4936 17.8822 11.6154 17.933C11.7373 17.9838 11.868 18.0099 12 18.0099C12.132 18.0099 12.2627 17.9838 12.3846 17.933C12.5064 17.8822 12.617 17.8078 12.71 17.7141Z"
        fill="white"
      />
    </svg>
  );
}

/**
 * "Back" link shared by all four registration-wizard steps (`/sign-up`, `/verify-email`,
 * `/member-profile`, `/build-profile`) — identical markup previously duplicated in each page;
 * extracted here since the custom arrow SVG isn't worth re-pasting four times. `href`/`label`
 * stay caller-supplied (same pattern as `RegistrationProgress`'s `label` prop) since each step
 * points at a different previous step and this has no internal state.
 */
export function RegistrationBackLink({ href, label, className }: RegistrationBackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex shrink-0 items-center gap-1 text-base font-bold text-foreground hover:text-muted-foreground md:absolute md:top-1/2 md:left-0 md:-translate-y-1/2',
        className,
      )}
    >
      <BackArrowIcon />
      {label}
    </Link>
  );
}
