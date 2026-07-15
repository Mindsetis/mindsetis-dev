'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { resendConfirmationEmail } from '@/app/[locale]/verify-email/actions';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

type ResendConfirmationEmailButtonProps = {
  /** The address to resend Supabase's confirmation email to — there is no session to resolve
   * it from at this point in the wizard (see `verify-email/actions.ts#resendConfirmationEmail`'s
   * doc comment), so the page passes it explicitly (resolved from `?email=`/the current
   * session, see `verify-email/page.tsx`). */
  email: string;
};

/**
 * "Resend email" button — registration wizard step 2/4 (`/verify-email`, stage 1.5 rework).
 * Client island (needs `useState` for the pending/toast round-trip) around the
 * `resendConfirmationEmail` Server Action, which resends Supabase Auth's real "Confirm signup"
 * email — a genuine retry of the blocking confirmation link, not a courtesy re-send of an
 * informational email (that's `build-profile/actions.ts`'s separate, still-correct welcome-email
 * send, unrelated to this button). Failures (including a rate-limit hit) surface via a `sonner`
 * toast — same pattern as `components/marketing/LeadCaptureDialog.tsx`. The action itself never
 * reveals whether the resend actually went out (enumeration protection), so success here always
 * shows the same generic "sent" toast regardless of what happened server-side.
 */
export function ResendConfirmationEmailButton({ email }: ResendConfirmationEmailButtonProps) {
  const t = useTranslations('auth.verifyEmail');
  const [isPending, setIsPending] = useState(false);

  async function handleResend() {
    setIsPending(true);
    const result = await resendConfirmationEmail({ email });
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(t('resendSuccess'));
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      loading={isPending}
      onClick={handleResend}
    >
      {isPending ? t('resending') : t('resend')}
    </Button>
  );
}
