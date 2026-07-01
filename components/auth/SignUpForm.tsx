'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';

import { signUp } from '@/app/[locale]/(auth)/actions';
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
import { Link, useRouter } from '@/i18n/navigation';
import { type SignUpInput, signUpSchema } from '@/lib/validation/auth';

import { applyFieldErrors } from './applyFieldErrors';

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

  const form = useForm<SignUpInput>({
    resolver: signUpResolver,
    defaultValues: { email: '', password: '', confirmPassword: '', fullName: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await signUp(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
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

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('signUp.fullName')}</FormLabel>
              <FormControl>
                <Input type="text" autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fields.password')}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fields.confirmPassword')}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t('signUp.submitting') : t('signUp.submit')}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t('signUp.haveAccount')}{' '}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t('signUp.loginLink')}
          </Link>
        </p>
      </form>
    </Form>
  );
}
