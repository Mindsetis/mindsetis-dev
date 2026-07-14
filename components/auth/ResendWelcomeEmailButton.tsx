'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { resendWelcomeEmail } from '@/app/[locale]/verify-email/actions';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

/**
 * "Resend email" button — registration wizard step 4/4 (`/verify-email`). Client island
 * (needs `useState` for the pending/toast round-trip) around the `resendWelcomeEmail` Server
 * Action. Purely a courtesy re-send of the informational welcome email now (not a
 * confirmation retry — the account is already confirmed/signed-in by the time this page is
 * reachable). Failures (including a rate-limit hit) surface to the user via a `sonner` toast —
 * same pattern as `components/marketing/LeadCaptureDialog.tsx`.
 *
 * Takes no email prop on purpose: `resendWelcomeEmail` resolves the target from the caller's
 * own session (`requireUser()`), never from client input — accepting an email here would just
 * invite passing it through to an action that no longer accepts it.
 */
export function ResendWelcomeEmailButton() {
  const t = useTranslations('auth.verifyEmail');
  const [isPending, setIsPending] = useState(false);

  async function handleResend() {
    setIsPending(true);
    const result = await resendWelcomeEmail({});
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
