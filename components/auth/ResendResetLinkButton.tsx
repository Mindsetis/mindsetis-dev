'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { requestPasswordReset } from '@/app/[locale]/(app)/(auth)/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

/**
 * "Resend link" on the Check-your-email screen (Figma `680:8880`).
 *
 * Calls the same `requestPasswordReset` the form did. That action is throttled per address (4 an
 * hour) on top of the per-IP limit, so a visitor tapping this repeatedly will eventually get the
 * rate-limit message back — surfaced here rather than swallowed, otherwise the button would look
 * like it worked while no mail was sent.
 */
export function ResendResetLinkButton({ email }: { email: string }) {
  const t = useTranslations('auth.checkEmail');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleResend = () => {
    setError(null);
    startTransition(async () => {
      const result = await requestPasswordReset({ email });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      toast.success(t('resent'));
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
        className="w-full"
      >
        {isPending ? t('resending') : t('resend')}
      </Button>
    </div>
  );
}
