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
import { PasswordToggle } from './password-field';

type SignInFormProps = {
  /** Safe relative path to return to after signing in (already validated by the page). */
  redirectTo?: string;
};

/**
 * Log-in form — Figma `679:8779` (desktop) / `1056:8939` (mobile).
 *
 * TWO deliberate departures from the frames, both about the password field:
 *
 *  - The "At least 8 characters / 1 uppercase / 1 number" checklist is NOT rendered. In the file
 *    it is the sign-up screen's `input password` component pasted whole; here the visitor is
 *    typing a password that already exists, so the rules can't be acted on, and spelling out the
 *    policy to an unauthenticated page is a small thing to hand an attacker for nothing.
 *  - "Forgot your password?" swaps sides of the submit button: the desktop frame puts it above,
 *    left-aligned, the mobile one below, centered. That is done with flex `order` rather than
 *    rendering the link twice.
 */
export function SignInForm({ redirectTo = '/' }: SignInFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
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

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('fields.password')} <span className="text-primary">*</span>
              </FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="pr-11"
                    {...field}
                  />
                </FormControl>
                <PasswordToggle
                  visible={showPassword}
                  onToggle={() => setShowPassword((value) => !value)}
                />
              </div>
              {/* A password may contain anything — see `FormMessage`'s `latinOnly` prop. */}
              <FormMessage latinOnly={false} />
            </FormItem>
          )}
        />

        {/* Below the button and centered on a phone, above it and left-aligned from `lg`. */}
        <Link
          href="/forgot-password"
          className="order-2 text-center text-base font-bold text-primary transition-colors hover:text-primary-hover lg:order-none lg:text-left"
        >
          {t('signIn.forgotPassword')}
        </Link>

        {/* `primaryOutline` IS the frame's "Secondary - 2a": gradient-edged border, brand text,
            soft cyan glow. */}
        <Button
          type="submit"
          variant="primaryOutline"
          size="lg"
          loading={form.formState.isSubmitting}
          className="order-1 w-full lg:order-none"
        >
          {form.formState.isSubmitting ? t('signIn.submitting') : t('signIn.submit')}
        </Button>

        <p className="order-3 text-center lg:order-none">
          <span className="text-tiny text-muted-foreground">{t('signIn.noAccount')} </span>
          <Link href="/sign-up" className="text-base font-bold text-foreground hover:text-primary">
            {t('signIn.signUpLink')}
          </Link>
        </p>
      </form>
    </Form>
  );
}
