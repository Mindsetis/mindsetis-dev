'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { requestPasswordReset } from '@/app/[locale]/(app)/(auth)/actions';
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
import { useRouter } from '@/i18n/navigation';
import { type ForgotPasswordInput, forgotPasswordSchema } from '@/lib/validation/auth';

import { applyFieldErrors } from './applyFieldErrors';

/**
 * "Reset your password" form — Figma `679:8913`.
 *
 * On success it NAVIGATES to `/forgot-password/sent?email=…` rather than swapping itself for an
 * inline success message the way it used to. The design draws "Check your email" as its own
 * screen, and a route survives a refresh, which the old in-component `sent` flag did not — the
 * page would silently fall back to an empty form the moment the visitor reloaded while waiting
 * for the mail.
 *
 * The action itself is unchanged and still never reveals whether the address exists.
 */
export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await requestPasswordReset(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }
    router.push(`/forgot-password/sent?email=${encodeURIComponent(values.email)}`);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
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
          variant="primaryOutline"
          size="lg"
          loading={form.formState.isSubmitting}
          className="w-full"
        >
          {form.formState.isSubmitting
            ? t('forgotPassword.submitting')
            : t('forgotPassword.submit')}
        </Button>
      </form>
    </Form>
  );
}
