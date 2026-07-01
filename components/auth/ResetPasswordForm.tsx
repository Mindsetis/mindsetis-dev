'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { updatePassword } from '@/app/[locale]/(auth)/actions';
import { useRouter } from '@/i18n/navigation';
import { type ResetPasswordInput, resetPasswordSchema } from '@/lib/validation/auth';

import { applyFieldErrors } from './applyFieldErrors';
import { AuthField, authInputClass } from './AuthField';
import { FormBanner } from './FormBanner';

export function ResetPasswordForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await updatePassword(values);
    if (!result.ok) {
      applyFieldErrors(setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }
    router.push('/login?reset=success');
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError ? <FormBanner>{formError}</FormBanner> : null}

      <AuthField label={t('fields.password')} htmlFor="password" error={errors.password?.message}>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          className={authInputClass}
          {...register('password')}
        />
      </AuthField>

      <AuthField
        label={t('fields.confirmPassword')}
        htmlFor="confirmPassword"
        error={errors.confirmPassword?.message}
      >
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
          className={authInputClass}
          {...register('confirmPassword')}
        />
      </AuthField>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t('resetPassword.submitting') : t('resetPassword.submit')}
      </button>
    </form>
  );
}
