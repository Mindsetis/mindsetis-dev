'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';

import { signUp } from '@/app/[locale]/(auth)/actions';
import { Link, useRouter } from '@/i18n/navigation';
import { type SignUpInput, signUpSchema } from '@/lib/validation/auth';

import { applyFieldErrors } from './applyFieldErrors';
import { AuthField, authInputClass } from './AuthField';
import { FormBanner } from './FormBanner';

/**
 * `fullName` is optional in `signUpSchema`, but an empty text input always submits `''`
 * (never `undefined`). Normalize the blank-optional field to `undefined` before handing off
 * to the (unmodified) Zod resolver, so leaving it blank doesn't trip the schema's checks.
 *
 * NOTE: username is intentionally NOT collected here — it's auto-derived on signup and the
 * user picks a final, availability-checked handle during onboarding (avoids the confusing
 * silent-rename when a typed username collides).
 */
const signUpResolver: Resolver<SignUpInput> = (values, context, options) => {
  const normalized = {
    ...values,
    fullName: values.fullName?.trim() ? values.fullName : undefined,
  };
  return zodResolver(signUpSchema)(normalized, context, options);
};

export function SignUpForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: signUpResolver,
    defaultValues: { email: '', password: '', confirmPassword: '', fullName: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await signUp(values);
    if (!result.ok) {
      applyFieldErrors(setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }
    if (result.data.needsEmailConfirmation) {
      router.push(`/verify-email?email=${encodeURIComponent(result.data.email)}`);
      return;
    }
    router.push('/');
    router.refresh();
  });

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

      <AuthField label={t('signUp.fullName')} htmlFor="fullName" error={errors.fullName?.message}>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          aria-invalid={!!errors.fullName}
          aria-describedby={errors.fullName ? 'fullName-error' : undefined}
          className={authInputClass}
          {...register('fullName')}
        />
      </AuthField>

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
        {isSubmitting ? t('signUp.submitting') : t('signUp.submit')}
      </button>

      <p className="text-center text-sm text-muted">
        {t('signUp.haveAccount')}{' '}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t('signUp.loginLink')}
        </Link>
      </p>
    </form>
  );
}
