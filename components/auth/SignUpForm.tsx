'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { signUp } from '@/app/[locale]/(app)/(auth)/actions';
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
import { type SignUpInput, signUpSchema } from '@/lib/validation/auth';

import { applyFieldErrors } from './applyFieldErrors';
import { PasswordRequirements, PasswordToggle } from './password-field';

type SignUpFormProps = {
  /** Prefilled from the homepage's quick-email-capture field, if the visitor came from there. */
  initialEmail?: string;
};

export function SignUpForm({ initialEmail }: SignUpFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // NOTE: username is intentionally NOT collected here — it's auto-derived on signup and
  // the user picks a final, availability-checked handle during onboarding (avoids the
  // confusing silent-rename when a typed username collides).
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    mode: 'onChange',
    defaultValues: {
      email: initialEmail ?? '',
      password: '',
      confirmPassword: '',
      fullName: '',
      lastName: '',
    },
  });
  const passwordValue = useWatch({ control: form.control, name: 'password' }) ?? '';

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await signUp(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }
    // signUp() no longer returns a session — the account is unconfirmed until the visitor
    // clicks the link in their inbox (see `(auth)/actions.ts#signUp`'s doc comment). Success
    // here just means the account was created; send them to the blocking verification step
    // (step 2) with the address so it can be displayed there.
    router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
  });

  return (
    <Form {...form}>
      {/* Outer gap is 16px mobile / 24px desktop (field-block-to-submit-button spacing) — the
          fields themselves keep their own tighter 12px mobile / 16px desktop rhythm in the
          wrapper below. */}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 md:gap-6">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-3 md:gap-4">
          {/* Figma's OAuth screen (`165:2853` / `387:1725`) has no email field — it assumes
              the identity comes from the OAuth provider. Google/LinkedIn sign-in are deferred
              (`OAuthButtons.tsx`, currently unused on this step — see that component's doc
              comment), so `signUpSchema.email` stays required and this
              field stays in the form: dropping it would break the only working sign-up path
              for anyone who lands on this page without a prefilled `?email=` (e.g. the header
              "Join" button). Kept in its prior position/behavior — not a new field. */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span className="inline-flex items-center gap-1">
                    {t('fields.email')} <span className="text-primary">*</span>
                  </span>
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
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span className="inline-flex items-center gap-1">
                    {t('signUp.fullName')} <span className="text-primary">*</span>
                  </span>
                </FormLabel>
                <FormControl>
                  <Input type="text" autoComplete="given-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span className="inline-flex items-center gap-1">
                    {t('signUp.lastName')} <span className="text-primary">*</span>
                  </span>
                </FormLabel>
                <FormControl>
                  <Input type="text" autoComplete="family-name" {...field} />
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
                  <span className="inline-flex items-center gap-1">
                    {t('fields.password')} <span className="text-primary">*</span>
                  </span>
                </FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="pr-11"
                      {...field}
                    />
                  </FormControl>
                  <PasswordToggle
                    visible={showPassword}
                    onToggle={() => setShowPassword((value) => !value)}
                  />
                </div>
                <PasswordRequirements password={passwordValue} />
                {/* A password may contain anything — see `FormMessage`'s `latinOnly` prop. */}
                <FormMessage latinOnly={false} />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {/* Stage 1.6: "Repeat Password" — dedicated key (not the shared
                      `fields.confirmPassword` also used by `ResetPasswordForm`) so that
                      screen's "Confirm password" label is unaffected by this sign-up-only
                      copy change. */}
                  <span className="inline-flex items-center gap-1">
                    {t('signUp.confirmPassword')} <span className="text-primary">*</span>
                  </span>
                </FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="pr-11"
                      {...field}
                    />
                  </FormControl>
                  <PasswordToggle
                    visible={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((value) => !value)}
                  />
                </div>
                <FormMessage latinOnly={false} />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          variant="primaryOutline"
          size="lg"
          loading={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? t('signUp.submitting') : t('signUp.submit')}
        </Button>
        {/* Stage 1.6: "Already have an account? Log in" removed per the user's copy tweaks. */}
      </form>
    </Form>
  );
}
