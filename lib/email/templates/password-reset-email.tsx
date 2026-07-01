import 'server-only';

import { Heading, Text } from '@react-email/components';

import { getEmailTranslator } from '@/lib/email/i18n';
import { BaseLayout, EmailButton, textStyles } from '@/lib/email/templates/base-layout';
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
      <Heading as="h1" style={textStyles.heading}>
        {t('passwordReset.heading')}
      </Heading>
      <Text style={textStyles.body}>
        {userName
          ? t('passwordReset.greeting', { name: userName })
          : t('passwordReset.greetingGeneric')}
      </Text>
      <Text style={textStyles.body}>{t('passwordReset.body')}</Text>
      <EmailButton href={actionUrl}>{t('passwordReset.cta')}</EmailButton>
      <Text style={textStyles.fine}>{t('passwordReset.expiry')}</Text>
    </BaseLayout>
  );
}

/** Localized subject line for the `password_reset` template — used by the registry & the queue row. */
export function passwordResetEmailSubject(locale: EmailLocale): string {
  return getEmailTranslator(locale)('passwordReset.subject');
}
