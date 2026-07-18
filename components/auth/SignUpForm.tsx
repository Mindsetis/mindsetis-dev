'use client';

import { zodResolver } from '@hookform/resolvers/zod';
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
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { type SignUpInput, signUpSchema } from '@/lib/validation/auth';

import { applyFieldErrors } from './applyFieldErrors';

type SignUpFormProps = {
  /** Prefilled from the homepage's quick-email-capture field, if the visitor came from there. */
  initialEmail?: string;
};

/**
 * Password-hint status icon (12×12) — `fill="currentColor"` so it inherits the `<li>`'s
 * success/destructive text color (replaces the previously-always-neutral `lucide-react` `Info`
 * icon). Note: the source asset as supplied had a hardcoded `fill="white"`; overridden to
 * `currentColor` here so the icon actually turns red/green with the hint text.
 */
function PasswordHintIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M6 11C3.23857 11 1 8.7614 1 6C1 3.23857 3.23857 1 6 1C8.7614 1 11 3.23857 11 6C11 8.7614 8.7614 11 6 11ZM6 5.5C5.72386 5.5 5.5 5.72386 5.5 6V8C5.5 8.27614 5.72386 8.5 6 8.5C6.27614 8.5 6.5 8.27614 6.5 8V6C6.5 5.72386 6.27614 5.5 6 5.5ZM6 3.5C5.72386 3.5 5.5 3.72386 5.5 4C5.5 4.27614 5.72386 4.5 6 4.5C6.27614 4.5 6.5 4.27614 6.5 4C6.5 3.72386 6.27614 3.5 6 3.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Live password requirement checklist — Figma "input password" shows three hint lines
 * ("At least 8 characters" / "At least 1 uppercase letter" / "At least 1 number") next to an
 * info icon. The uppercase-letter hint mirrors `passwordSchema`'s `/[A-Z]/` regex
 * (`lib/validation/common.ts`), so the enforced rule and the displayed copy stay in sync.
 *
 * Color states: neutral `text-foreground` (white) before the visitor has typed anything —
 * nothing has been checked yet, so nothing should read as failing. Once `password` is
 * non-empty, each hint switches to `text-success`/`text-destructive` per whether it's met.
 */
function PasswordRequirements({ password }: { password: string }) {
  const t = useTranslations('auth');
  const isChecking = password.length > 0;

  const requirements = [
    { key: 'length', met: password.length >= 8 },
    { key: 'letter', met: /[A-Z]/.test(password) },
    { key: 'number', met: /[0-9]/.test(password) },
  ] as const;

  return (
    <ul className="flex flex-col gap-1">
      {requirements.map(({ key, met }) => (
        <li
          key={key}
          className={cn(
            'flex items-center gap-1 text-tiny font-normal',
            !isChecking && 'text-foreground',
            isChecking && (met ? 'text-success' : 'text-destructive'),
          )}
        >
          <PasswordHintIcon />
          {t(`signUp.passwordHints.${key}`)}
        </li>
      ))}
    </ul>
  );
}

/**
 * Icon shown while the password is HIDDEN (`visible === false`) — clicking it reveals the
 * password. Fill is a literal hardcoded `#747474` (this codebase's convention for custom
 * icon assets, e.g. `AvatarUpload.tsx`'s `UploadIcon`), not `currentColor`.
 */
function PasswordHiddenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <g clipPath="url(#clip0_2013_1066)">
        <path
          d="M3.01495 3.9563L0.930409 1.87177L1.87322 0.928955L15.0726 14.1283L14.1298 15.0711L11.9231 12.8645C10.7889 13.5836 9.44384 14.0001 8.0015 14.0001C4.40672 14.0001 1.41607 11.4135 0.789062 8.00006C1.08018 6.41514 1.88085 5.00852 3.01495 3.9563ZM9.83977 10.7811L8.86377 9.80512C8.60264 9.93006 8.31024 10.0001 8.0015 10.0001C6.8969 10.0001 6.00148 9.10459 6.00148 8.00006C6.00148 7.69126 6.07145 7.39886 6.19639 7.13772L5.22041 6.16177C4.8714 6.68872 4.66814 7.32066 4.66814 8.00006C4.66814 9.84099 6.16053 11.3334 8.0015 11.3334C8.68084 11.3334 9.31277 11.1301 9.83977 10.7811ZM5.31761 2.50669C6.14882 2.17965 7.05417 2.00003 8.0015 2.00003C11.5962 2.00003 14.5869 4.58654 15.2139 8.00006C15.0058 9.13312 14.5372 10.1751 13.8725 11.0616L11.2993 8.48839C11.3227 8.32899 11.3348 8.16592 11.3348 8.00006C11.3348 6.15908 9.84244 4.6667 8.0015 4.6667C7.83557 4.6667 7.6725 4.67881 7.5131 4.70221L5.31761 2.50669Z"
          fill="#747474"
        />
      </g>
      <defs>
        <clipPath id="clip0_2013_1066">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

/**
 * Icon shown while the password is VISIBLE (`visible === true`) — clicking it hides the
 * password again. Fill is a literal hardcoded `#79B9E3` (matches `--color-primary`, kept as a
 * literal per the same custom-icon convention, not `currentColor`).
 */
function PasswordVisibleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M0.789062 8C1.41607 4.58651 4.40672 2 8.0015 2C11.5962 2 14.5869 4.58651 15.2139 8C14.5869 11.4135 11.5962 14 8.0015 14C4.40672 14 1.41607 11.4135 0.789062 8ZM8.0015 11.3333C9.84244 11.3333 11.3348 9.84093 11.3348 8C11.3348 6.15905 9.84244 4.66667 8.0015 4.66667C6.16053 4.66667 4.66814 6.15905 4.66814 8C4.66814 9.84093 6.16053 11.3333 8.0015 11.3333ZM8.0015 10C6.8969 10 6.00148 9.1046 6.00148 8C6.00148 6.8954 6.8969 6 8.0015 6C9.10604 6 10.0015 6.8954 10.0015 8C10.0015 9.1046 9.10604 10 8.0015 10Z"
        fill="#79B9E3"
      />
    </svg>
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
      className="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
    >
      {visible ? <PasswordVisibleIcon /> : <PasswordHiddenIcon />}
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
        {/* Stage 1.6: "Already have an account? Log in" removed per the user's copy tweaks. */}
      </form>
    </Form>
  );
}
