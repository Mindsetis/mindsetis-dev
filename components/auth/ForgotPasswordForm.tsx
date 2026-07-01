'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { requestPasswordReset } from '@/app/[locale]/(auth)/actions';
import { Link } from '@/i18n/navigation';
import { type ForgotPasswordInput, forgotPasswordSchema } from '@/lib/validation/auth';

import { applyFieldErrors } from './applyFieldErrors';
import { AuthField, authInputClass } from './AuthField';
import { FormBanner } from './FormBanner';

export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await requestPasswordReset(values);
    if (!result.ok) {
      applyFieldErrors(setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }
    setSent(true);
  });

  if (sent) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <FormBanner variant="success">{t('forgotPassword.successMessage')}</FormBanner>
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
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError ? <FormBanner>{formError}</FormBanner> : null}

      <AuthField label={t('fields.email')} htmlFor="email" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={authInputClass}
          {...register('email')}
        />
      </AuthField>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
      </button>

      <p className="text-center text-sm text-muted">
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t('forgotPassword.backToLogin')}
        </Link>
      </p>
    </form>
  );
}
