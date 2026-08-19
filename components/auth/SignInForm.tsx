'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { signIn } from '@/app/[locale]/(app)/(auth)/actions';
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
import { type SignInInput, signInSchema } from '@/lib/validation/auth';

import { applyFieldErrors } from './applyFieldErrors';

type SignInFormProps = {
  /** Safe relative path to return to after signing in (already validated by the page). */
  redirectTo?: string;
};

export function SignInForm({ redirectTo = '/' }: SignInFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '', redirectTo },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await signIn(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }
    router.push(redirectTo || '/');
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

        <input type="hidden" {...form.register('redirectTo')} />

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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fields.password')}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('signIn.forgotPassword')}
          </Link>
        </div>

        <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t('signIn.submitting') : t('signIn.submit')}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t('signIn.noAccount')}{' '}
          <Link
            href="/sign-up"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t('signIn.signUpLink')}
          </Link>
        </p>
      </form>
    </Form>
  );
}
