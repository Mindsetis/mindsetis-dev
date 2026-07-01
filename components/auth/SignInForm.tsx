'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { signIn } from '@/app/[locale]/(auth)/actions';
import { Link, useRouter } from '@/i18n/navigation';
import { type SignInInput, signInSchema } from '@/lib/validation/auth';

import { applyFieldErrors } from './applyFieldErrors';
import { AuthField, authInputClass } from './AuthField';
import { FormBanner } from './FormBanner';

type SignInFormProps = {
  /** Safe relative path to return to after signing in (already validated by the page). */
  redirectTo?: string;
};

export function SignInForm({ redirectTo = '/' }: SignInFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '', redirectTo },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await signIn(values);
    if (!result.ok) {
      applyFieldErrors(setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }
    router.push(redirectTo || '/');
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError ? <FormBanner>{formError}</FormBanner> : null}

      <input type="hidden" {...register('redirectTo')} />

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

      <AuthField label={t('fields.password')} htmlFor="password" error={errors.password?.message}>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          className={authInputClass}
          {...register('password')}
        />
      </AuthField>

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          {t('signIn.forgotPassword')}
        </Link>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t('signIn.submitting') : t('signIn.submit')}
      </button>

      <p className="text-center text-sm text-muted">
        {t('signIn.noAccount')}{' '}
        <Link
          href="/sign-up"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t('signIn.signUpLink')}
        </Link>
      </p>
    </form>
  );
}
