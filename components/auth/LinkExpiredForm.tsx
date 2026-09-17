'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

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

/**
 * "Get me a new link" form on `/link-expired`.
 *
 * Unlike `ResendConfirmationEmailButton` on `/verify-email`, this one has to ASK for the
 * address: that page knows it (the visitor typed it one screen earlier and it rides along in
 * `?email=`), whereas someone arriving here clicked a stale link in their inbox, possibly days
 * later, possibly on another device. So the email field is the whole point of the screen.
 *
 * Same Server Action underneath (`resendConfirmationEmail`), which keeps its per-address
 * ceiling of 4 mails/hour and its deliberate refusal to say whether an address has an account —
 * so success here is always the same generic message no matter what happened server-side.
 *
 * The field starts empty on purpose: nothing upstream knows the address. Supabase's dead-link
 * redirect carries no email, and inventing a `?email=` prop that no caller can fill would be
 * code kept "just in case".
 */
export function LinkExpiredForm() {
  const t = useTranslations('auth');
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const form = useForm<ResendConfirmationEmailInput>({
    resolver: zodResolver(resendConfirmationEmailSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(
    async (values) => {
      setFormError(null);
      // Clear the previous outcome before asking again, or a later failure lands next to a
      // stale green "a new link is on its way" and the screen contradicts itself.
      setSent(false);
      const result = await resendConfirmationEmail(values);

      if (!result.ok) {
        applyFieldErrors(form.setError, result.error.fieldErrors);
        // The rate limit is the one failure worth naming — it is the visitor's own doing and
        // they can act on it by waiting. Everything else keeps the server's message.
        setFormError(
          result.error.code === 'rate_limited'
            ? t('verifyEmail.resendRateLimited')
            : result.error.message,
        );
        return;
      }

      setSent(true);
      toast.success(t('linkExpired.success'));
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
            <AlertDescription>{t('linkExpired.success')}</AlertDescription>
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
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? t('linkExpired.submitting') : t('linkExpired.submit')}
        </Button>
      </form>
    </Form>
  );
}
