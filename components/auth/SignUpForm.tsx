'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

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
import { cn } from '@/lib/utils';
import { type SignUpInput, signUpSchema } from '@/lib/validation/auth';

import { applyFieldErrors } from './applyFieldErrors';
import { OAuthButtons } from './OAuthButtons';

type SignUpFormProps = {
  /** Prefilled from the onboarding flow's query param, if the visitor came from there. */
  initialEmail?: string;
};

/**
 * Live password requirement checklist — Figma "input password" shows three hint lines
 * ("At least 8 characters" / "At least 1 uppercase latter" / "At least 1 number") next to an
 * info icon. The middle line is adjusted to "Contains a letter" here: `passwordSchema`
 * (`lib/validation/common.ts`) only requires *a* letter, not specifically an uppercase one —
 * showing the Figma copy verbatim would tell users a rule that isn't actually enforced.
 */
function PasswordRequirements({ password }: { password: string }) {
  const t = useTranslations('auth');

  const requirements = [
    { key: 'length', met: password.length >= 8 },
    { key: 'letter', met: /[A-Za-z]/.test(password) },
    { key: 'number', met: /[0-9]/.test(password) },
  ] as const;

  return (
    <ul className="flex flex-col gap-1">
      {requirements.map(({ key, met }) => (
        <li
          key={key}
          className={cn(
            'flex items-center gap-2 text-tiny',
            met ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <Info aria-hidden="true" className="size-3 shrink-0 text-foreground" />
          {t(`signUp.passwordHints.${key}`)}
        </li>
      ))}
    </ul>
  );
}

/** Trailing show/hide toggle overlaid on a password `<Input>`. */
function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  const t = useTranslations('auth');

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? t('signUp.hidePassword') : t('signUp.showPassword')}
      className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
    >
      {visible ? (
        <EyeOff className="size-4" aria-hidden="true" />
      ) : (
        <Eye className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}

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
    if (result.data.needsEmailConfirmation) {
      router.push(`/verify-email?email=${encodeURIComponent(result.data.email)}`);
      return;
    }
    router.push('/');
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

        <OAuthButtons />

        <div className="flex flex-col gap-3">
          {/* Figma's OAuth screen (`165:2853` / `387:1725`) has no email field — it assumes
              the identity comes from the OAuth provider. Google/LinkedIn sign-in are deferred
              here (see `OAuthButtons.tsx`), so `signUpSchema.email` stays required and this
              field stays in the form: dropping it would break the only working sign-up path
              for anyone who lands on this page without a prefilled `?email=` (e.g. the header
              "Join" button). Kept in its prior position/behavior — not a new field. */}
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
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('signUp.fullName')} <span className="text-primary">*</span>
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
                  {t('signUp.lastName')} <span className="text-primary">*</span>
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
                  {t('fields.password')} <span className="text-primary">*</span>
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="pr-11"
                      {...field}
                    />
                    <PasswordToggle
                      visible={showPassword}
                      onToggle={() => setShowPassword((value) => !value)}
                    />
                  </div>
                </FormControl>
                <PasswordRequirements password={passwordValue} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('fields.confirmPassword')} <span className="text-primary">*</span>
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="pr-11"
                      {...field}
                    />
                    <PasswordToggle
                      visible={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword((value) => !value)}
                    />
                  </div>
                </FormControl>
                <FormMessage />
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
