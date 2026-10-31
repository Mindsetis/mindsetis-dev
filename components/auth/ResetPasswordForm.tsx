'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { updatePassword } from '@/app/[locale]/(app)/(auth)/actions';
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
import { toast } from '@/components/ui/sonner';
import { Link, useRouter } from '@/i18n/navigation';
import { type ResetPasswordInput, resetPasswordSchema } from '@/lib/validation/auth';

import { applyFieldErrors } from './applyFieldErrors';
import { authErrorText } from './auth-errors';
import { PasswordRequirements, PasswordToggle } from './password-field';

type FieldName = 'password' | 'confirmPassword';

const FIELDS = [
  { name: 'password', label: 'newPassword' },
  { name: 'confirmPassword', label: 'repeatPassword' },
] as const satisfies ReadonlyArray<{ name: FieldName; label: string }>;

/**
 * "Set a new password" — Figma `680:8987` (desktop) / `1057:9048` (mobile).
 *
 * Both fields carry the same three-line requirement checklist, as the frame draws it, each
 * reacting to its own field. Unlike the log-in screen — where that checklist is copied-in debris
 * describing a password that already exists — here it is doing real work: these ARE the rules the
 * new password must satisfy.
 *
 * On success the visitor stays signed in and goes straight on (Release 2 П3): `updatePassword`
 * revokes their OTHER sessions, keeps this one, and returns where they belong — the cabinet or the
 * wizard step they never finished — with a "Password updated successfully!" toast. The old
 * `/password-changed` screen (Figma `680:9123`) and its "Log in" button are gone: the recovery link
 * already proved they own the inbox, so asking them to type the new password again added nothing.
 */
export function ResetPasswordForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  // Set when there is no recovery session at all (link opened in another browser, session
  // expired): the only useful next step is a fresh link, so the banner offers one.
  const [sessionMissing, setSessionMissing] = useState(false);
  const [visible, setVisible] = useState<Record<FieldName, boolean>>({
    password: false,
    confirmPassword: false,
  });

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
    defaultValues: { password: '', confirmPassword: '' },
  });

  const values = useWatch({ control: form.control });

  const onSubmit = form.handleSubmit(async (input) => {
    setFormError(null);
    setSessionMissing(false);
    const result = await updatePassword(input);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      if (result.error.code === 'unauthenticated') {
        setSessionMissing(true);
        setFormError(t('resetPassword.sessionExpired'));
      } else if (result.error.code === 'conflict') {
        setFormError(t('resetPassword.samePassword'));
      } else {
        setFormError(authErrorText(t, result.error));
      }
      return;
    }
    // The toast lives in the root layout's `<Toaster>`, which survives client-side navigation, so
    // it is still on screen when the destination renders. `refresh()` re-reads the session for
    // the header/account menu, the same as after a log-in.
    toast.success(t('resetPassword.success'));
    router.push(result.data.next);
    router.refresh();
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{formError}</span>
              {sessionMissing ? (
                <Link
                  href="/forgot-password"
                  className="font-bold underline underline-offset-2 hover:text-primary"
                >
                  {t('resetPassword.requestNew')}
                </Link>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        {FIELDS.map((entry) => (
          <FormField
            key={entry.name}
            control={form.control}
            name={entry.name}
            render={({ field }) => (
              <FormItem className="flex flex-col gap-2">
                <FormLabel>
                  {t(`resetPassword.${entry.label}`)} <span className="text-primary">*</span>
                </FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={visible[entry.name] ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="pr-11"
                      {...field}
                    />
                  </FormControl>
                  <PasswordToggle
                    visible={visible[entry.name]}
                    onToggle={() =>
                      setVisible((state) => ({ ...state, [entry.name]: !state[entry.name] }))
                    }
                  />
                </div>
                <PasswordRequirements password={values[entry.name] ?? ''} />
                {/* Every field here is a password — see `FormMessage`'s `latinOnly` prop. */}
                <FormMessage latinOnly={false} />
              </FormItem>
            )}
          />
        ))}

        <Button
          type="submit"
          variant="primaryOutline"
          size="lg"
          loading={form.formState.isSubmitting}
          className="w-full"
        >
          {form.formState.isSubmitting ? t('resetPassword.submitting') : t('resetPassword.submit')}
        </Button>
      </form>
    </Form>
  );
}
