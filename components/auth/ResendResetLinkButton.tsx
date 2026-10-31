'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { requestPasswordReset } from '@/app/[locale]/(app)/(auth)/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

import { authErrorText } from './auth-errors';
import { startResendCooldown, useResendCooldown } from './resend-cooldown';

/**
 * "Resend link" on the Check-your-email screen (Figma `680:8880`).
 *
 * Calls the same `requestPasswordReset` the form did. That action is throttled per address (4 an
 * hour) on top of the per-IP limit, so a visitor tapping this repeatedly will eventually get the
 * rate-limit message back — surfaced here rather than swallowed, otherwise the button would look
 * like it worked while no mail was sent.
 *
 * Every send is followed by a 60-second pause (Release 2 Т1, `resend-cooldown.ts`): the button is
 * disabled and reads "Resend in 0:45". `ForgotPasswordForm` starts the same clock when it sends
 * the first mail, so this screen does not offer an instant second one on arrival.
 */
export function ResendResetLinkButton({ email }: { email: string }) {
  const t = useTranslations('auth');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { coolingDown, label } = useResendCooldown('reset', email);

  const handleResend = () => {
    setError(null);
    startTransition(async () => {
      const result = await requestPasswordReset({ email });
      if (!result.ok) {
        if (result.error.code === 'rate_limited') {
          startResendCooldown('reset', email);
          setError(t('verifyEmail.resendRateLimited'));
        } else {
          setError(authErrorText(t, result.error));
        }
        return;
      }
      startResendCooldown('reset', email);
      toast.success(t('checkEmail.resent'));
    });
  };

  return (
    <div className="flex w-full flex-col gap-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="button"
        variant="primaryOutline"
        size="lg"
        onClick={handleResend}
        loading={isPending}
        disabled={coolingDown}
        className="w-full"
      >
        {isPending ? t('checkEmail.resending') : (label ?? t('checkEmail.resend'))}
      </Button>
    </div>
  );
}
