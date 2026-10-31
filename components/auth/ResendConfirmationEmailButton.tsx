'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { resendConfirmationEmail } from '@/app/[locale]/(app)/verify-email/actions';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

import { startResendCooldown, useResendCooldown } from './resend-cooldown';

type ResendConfirmationEmailButtonProps = {
  /** The address to resend Supabase's confirmation email to — there is no session to resolve
   * it from at this point in the wizard (see `verify-email/actions.ts#resendConfirmationEmail`'s
   * doc comment), so the page passes it explicitly (resolved from `?email=`/the current
   * session, see `verify-email/page.tsx`). */
  email: string;
};

/**
 * "Resend email" button — registration wizard step 2/4 (`/verify-email`, stage 1.5 rework), also
 * offered by the log-in form for an address that was never confirmed.
 * Client island (needs `useState` for the pending/toast round-trip) around the
 * `resendConfirmationEmail` Server Action, which resends Supabase Auth's real "Confirm signup"
 * email — a genuine retry of the blocking confirmation link, not a courtesy re-send of an
 * informational email (that's `build-profile/actions.ts`'s separate, still-correct welcome-email
 * send, unrelated to this button). Failures (including a rate-limit hit) surface via a `sonner`
 * toast — same pattern as any other client-island Server Action call in this codebase. The action itself never
 * reveals whether the resend actually went out (enumeration protection), so success here always
 * shows the same generic "sent" toast regardless of what happened server-side.
 *
 * A 60-second pause follows every send (Release 2 Т1, `resend-cooldown.ts`): the button is
 * disabled and reads "Resend in 0:45". The pause also starts when sign-up first mails the link,
 * so this button does not offer an instant second mail on arrival.
 */
export function ResendConfirmationEmailButton({ email }: ResendConfirmationEmailButtonProps) {
  const t = useTranslations('auth.verifyEmail');
  const [isPending, setIsPending] = useState(false);
  const { coolingDown, label } = useResendCooldown('confirmation', email);

  async function handleResend() {
    setIsPending(true);
    const result = await resendConfirmationEmail({ email });
    setIsPending(false);

    if (!result.ok) {
      // Rate-limit is the one failure the action surfaces (see its doc comment) — show a
      // localized, actionable message rather than the raw English server string. Every other
      // failure keeps the generic server message.
      if (result.error.code === 'rate_limited') {
        // The server just said "too many": back off here as well instead of inviting a retry.
        startResendCooldown('confirmation', email);
        toast.error(t('resendRateLimited'));
      } else {
        toast.error(result.error.message);
      }
      return;
    }
    startResendCooldown('confirmation', email);
    toast.success(t('resendSuccess'));
  }

  return (
    <Button
      type="button"
      variant="primaryOutline"
      size="lg"
      className="w-full"
      loading={isPending}
      disabled={coolingDown}
      onClick={handleResend}
    >
      {isPending ? t('resending') : (label ?? t('resend'))}
    </Button>
  );
}
