import 'server-only';

import { getEmailTranslator } from '@/lib/email/i18n';
import {
  BaseLayout,
  EmailButton,
  EmailHeading,
  EmailText,
} from '@/lib/email/templates/base-layout';
import type { EmailLocale, PasswordResetEmailProps } from '@/lib/validation/email';

export type PasswordResetEmailComponentProps = PasswordResetEmailProps & { locale: EmailLocale };

/**
 * `password_reset` template — password reset link.
 *
 * Reusable layout for when Mindsetis sends its OWN password-reset email. Supabase's
 * built-in auth mailer still owns the actual `forgotPassword` flow as of stage 0.9 (see
 * the `email_queue` migration header) — this component is the ready-to-use replacement
 * for when that changes.
 */
export function PasswordResetEmail({
  actionUrl,
  userName,
  locale,
}: PasswordResetEmailComponentProps) {
  const t = getEmailTranslator(locale);
  return (
    <BaseLayout previewText={t('passwordReset.heading')} t={t}>
      <EmailHeading>{t('passwordReset.heading')}</EmailHeading>
      <EmailText>
        {userName
          ? t('passwordReset.greeting', { name: userName })
          : t('passwordReset.greetingGeneric')}
      </EmailText>
      <EmailText>{t('passwordReset.body')}</EmailText>
      <EmailButton href={actionUrl}>{t('passwordReset.cta')}</EmailButton>
      <EmailText variant="fine">{t('passwordReset.expiry')}</EmailText>
    </BaseLayout>
  );
}

/** Localized subject line for the `password_reset` template — used by the registry & the queue row. */
export function passwordResetEmailSubject(locale: EmailLocale): string {
  return getEmailTranslator(locale)('passwordReset.subject');
}
