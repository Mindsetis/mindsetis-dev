'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { resendConfirmationEmail } from '@/app/[locale]/verify-email/actions';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

type ResendConfirmationButtonProps = {
  /** Resolved email (session or `?email=` query param) — see `verify-email/page.tsx` and
   *  `verify-email/actions.ts`'s doc comments for the two reachable states. May be `undefined`
   *  in the rare case neither is available; the action still surfaces a clear error then. */
  email?: string;
};

/**
 * "Resend email" button — registration wizard step 4/4 (`/verify-email`, stage 1.4 Figma
 * audit). Client island (needs `useState` for the pending/toast round-trip) around the new
 * `resendConfirmationEmail` Server Action. Unlike step 3's silent best-effort resend, failures
 * (including a rate-limit hit) surface to the user via a `sonner` toast — same pattern as
 * `components/marketing/LeadCaptureDialog.tsx`.
 */
export function ResendConfirmationButton({ email }: ResendConfirmationButtonProps) {
  const t = useTranslations('auth.verifyEmail');
  const [isPending, setIsPending] = useState(false);

  async function handleResend() {
    setIsPending(true);
    const result = await resendConfirmationEmail(email ? { email } : {});
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
      variant="primaryOutline"
      size="lg"
      className="w-full"
      loading={isPending}
      onClick={handleResend}
    >
      {isPending ? t('resending') : t('resend')}
    </Button>
  );
}
