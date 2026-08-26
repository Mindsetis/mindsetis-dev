'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { changePassword } from '@/app/[locale]/(app)/dashboard/settings/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { PasswordRequirements, PasswordToggle } from '@/components/auth/password-field';
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
import { type ChangePasswordInput, changePasswordSchema } from '@/lib/validation/account-settings';

type PasswordFieldName = keyof ChangePasswordInput;

/**
 * `autoComplete="off"` on the CURRENT password, not the semantically-correct `current-password`.
 *
 * That value makes a password manager fill the field the moment the page loads, which hands the
 * old password to whoever is sitting at the browser — the exact person `changePassword`'s
 * re-authentication step exists to stop. A re-auth prompt only means anything if a human types the
 * answer. (Browsers are free to ignore `off`; this raises the bar rather than guaranteeing an
 * empty field, and the server-side check stands either way.)
 *
 * The two NEW password fields keep `new-password`: there is nothing saved for a manager to fill
 * there, and the value is what lets it offer to generate and then store the new one.
 */
const FIELDS = [
  { name: 'currentPassword', label: 'current', autoComplete: 'off' },
  { name: 'newPassword', label: 'new', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'repeat', autoComplete: 'new-password' },
] as const satisfies ReadonlyArray<{
  name: PasswordFieldName;
  label: string;
  autoComplete: string;
}>;

/**
 * Cabinet → Settings → Account → "Change password" (Figma `708:9215` / `623:6675`).
 *
 * Three fields in one row on desktop, stacked below `md` — the design draws them side by side at
 * 1440 and the cabinet has no mobile frame at all, so the stacked variant is this component's own
 * call rather than a design decision.
 *
 * Every field carries the same three-line requirement checklist, exactly as the design shows it,
 * including under "Current password" where it can only ever describe the password being replaced.
 * The checklist reacts to what is typed in ITS OWN field (`useWatch` per field), so it stays a
 * live indicator rather than three copies of one state.
 *
 * On success the form resets to empty rather than keeping the typed values: unlike the profile
 * editors, there is no "saved state" worth showing here — the new password must not sit in three
 * inputs afterwards.
 */
export function ChangePasswordForm() {
  const t = useTranslations('dashboard.settings.account.changePassword');
  const [formError, setFormError] = useState<string | null>(null);
  const [visible, setVisible] = useState<Record<PasswordFieldName, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onChange',
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const values = useWatch({ control: form.control });

  const onSubmit = form.handleSubmit(async (input) => {
    setFormError(null);

    const result = await changePassword(input);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }

    form.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setVisible({ currentPassword: false, newPassword: false, confirmPassword: false });
    toast.success(t('success'));
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-5 md:grid-cols-3">
          {FIELDS.map((field) => (
            <FormField
              key={field.name}
              control={form.control}
              name={field.name}
              render={({ field: controls }) => (
                <FormItem className="flex flex-col gap-2">
                  {/* Default label variant, not `boldSpacing`: the Settings frames render these
                      in plain sentence case ("Current password *"), unlike the profile editors'
                      uppercase tracked labels. */}
                  <FormLabel>
                    {t(`fields.${field.label}`)} <span className="text-primary">*</span>
                  </FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={visible[field.name] ? 'text' : 'password'}
                        autoComplete={field.autoComplete}
                        className="pr-11"
                        {...controls}
                      />
                    </FormControl>
                    <PasswordToggle
                      visible={visible[field.name]}
                      onToggle={() =>
                        setVisible((state) => ({ ...state, [field.name]: !state[field.name] }))
                      }
                    />
                  </div>
                  <PasswordRequirements password={values[field.name] ?? ''} />
                  {/* Every field here is a password — see `FormMessage`'s `latinOnly` prop. */}
                  <FormMessage latinOnly={false} />
                </FormItem>
              )}
            />
          ))}
        </div>

        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="w-fit px-5"
          loading={form.formState.isSubmitting}
        >
          {t('submit')}
        </Button>
      </form>
    </Form>
  );
}
