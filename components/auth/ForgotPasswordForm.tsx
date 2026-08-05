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
import { Link } from '@/i18n/navigation';
import { type ForgotPasswordInput, forgotPasswordSchema } from '@/lib/validation/auth';

import { applyFieldErrors } from './applyFieldErrors';

export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

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
    setSent(true);
  });

  if (sent) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <Alert variant="success">
          <AlertDescription>{t('forgotPassword.successMessage')}</AlertDescription>
        </Alert>
        <Link
          href="/login"
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t('forgotPassword.backToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
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
              <FormLabel>{t('fields.email')}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
          {form.formState.isSubmitting
            ? t('forgotPassword.submitting')
            : t('forgotPassword.submit')}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t('forgotPassword.backToLogin')}
          </Link>
        </p>
      </form>
    </Form>
  );
}
