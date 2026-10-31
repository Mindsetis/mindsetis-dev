'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { requestPasswordReset } from '@/app/[locale]/(app)/(auth)/actions';
import { resendConfirmationEmail } from '@/app/[locale]/(app)/verify-email/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import {
  type ResendConfirmationEmailInput,
  resendConfirmationEmailSchema,
} from '@/lib/validation/auth';

import { applyFieldErrors } from './applyFieldErrors';
import { authErrorText } from './auth-errors';
import { startResendCooldown, useResendCooldown } from './resend-cooldown';

type LinkExpiredFormProps = {
  /**
   * Which email the dead link came from (`/api/auth/confirm` → `?type=`):
   *  - `signup`   — a confirmation link; the button resends the confirmation email.
   *  - `recovery` — a password-reset link; the button requests a NEW reset email.
   */
  variant: 'signup' | 'recovery';
};

/**
 * "Get me a new link" form on `/link-expired`.
 *
 * Unlike `ResendConfirmationEmailButton` on `/verify-email`, this one has to ASK for the
 * address: that page knows it (the visitor typed it one screen earlier and it rides along in
 * `?email=`), whereas someone arriving here clicked a stale link in their inbox, possibly days
 * later, possibly on another device. So the email field is the whole point of the screen.
 *
 * TWO VARIANTS, ONE FORM (Release 2 П2). The screen used to ALWAYS call `resendConfirmationEmail`
 * (`auth.resend({ type: 'signup' })`), which for an account that is already confirmed does
 * nothing — so a dead password-reset link could never be replaced and a lost password could not
 * be recovered. For `recovery` the same field now calls `requestPasswordReset`, which generates a
 * genuinely new reset email.
 *
 * Both actions keep their per-address ceiling of 4 mails/hour and their deliberate refusal to say
 * whether an address has an account — so success here is always the same generic message no
 * matter what happened server-side. Both are also followed by the 60-second resend pause
 * (Release 2 Т1, `resend-cooldown.ts`), keyed by the address typed in the field.
 *
 * The field starts empty on purpose: nothing upstream knows the address. Supabase's dead-link
 * redirect carries no email, and inventing a `?email=` prop that no caller can fill would be
 * code kept "just in case".
 */
export function LinkExpiredForm({ variant }: LinkExpiredFormProps) {
  const t = useTranslations('auth');
  const isRecovery = variant === 'recovery';
  const copy = isRecovery ? 'linkExpired.recovery' : 'linkExpired';
  const scope = isRecovery ? 'reset' : 'confirmation';
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Both variants take exactly `{ email }`, so the one schema serves either.
  const form = useForm<ResendConfirmationEmailInput>({
    resolver: zodResolver(resendConfirmationEmailSchema),
    defaultValues: { email: '' },
  });
  // The pause belongs to the address currently typed, so correcting a typo is not held up by the
  // mail that went to the wrong one.
  const typedEmail = useWatch({ control: form.control, name: 'email' }) ?? '';
  const { coolingDown, label } = useResendCooldown(scope, typedEmail);

  const onSubmit = form.handleSubmit(
    async (values) => {
      setFormError(null);
      // Clear the previous outcome before asking again, or a later failure lands next to a
      // stale green "a new link is on its way" and the screen contradicts itself.
      setSent(false);
      const result = isRecovery
        ? await requestPasswordReset(values)
        : await resendConfirmationEmail(values);

      if (!result.ok) {
        applyFieldErrors(form.setError, result.error.fieldErrors);
        // The rate limit is the one failure worth naming — it is the visitor's own doing and
        // they can act on it by waiting. Everything else gets the generic localized copy.
        if (result.error.code === 'rate_limited') {
          startResendCooldown(scope, values.email);
          setFormError(t('verifyEmail.resendRateLimited'));
        } else {
          setFormError(authErrorText(t, result.error));
        }
        return;
      }

      startResendCooldown(scope, values.email);
      setSent(true);
      toast.success(t(`${copy}.success`));
    },
    () => {
      setSent(false);
      setFormError(t('errors.formInvalid'));
    },
  );

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        {sent ? (
          <Alert>
            <AlertDescription>{t(`${copy}.success`)}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('fields.email')} <span className="text-primary">*</span>
              </FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={form.formState.isSubmitting}
          disabled={form.formState.isSubmitting || coolingDown}
        >
          {form.formState.isSubmitting
            ? t('linkExpired.submitting')
            : (label ?? t(`${copy}.submit`))}
        </Button>
      </form>
    </Form>
  );
}
