import 'server-only';

import { Heading, Text } from '@react-email/components';

import { getEmailTranslator } from '@/lib/email/i18n';
import { BaseLayout, EmailButton, textStyles } from '@/lib/email/templates/base-layout';
import type { EmailLocale, VerificationEmailProps } from '@/lib/validation/email';

export type VerificationEmailComponentProps = VerificationEmailProps & { locale: EmailLocale };

/**
 * `verification` template — email verification / activation link.
 *
 * Reusable layout for when Mindsetis sends its OWN verification email (reminders,
 * future re-sends). Supabase's built-in auth mailer still owns the actual sign-up
 * confirmation flow as of stage 0.9 (see the `email_queue` migration header) — this
 * component is the ready-to-use replacement for when that changes.
 */
export function VerificationEmail({
  actionUrl,
  userName,
  locale,
}: VerificationEmailComponentProps) {
  const t = getEmailTranslator(locale);
  return (
    <BaseLayout previewText={t('verification.heading')} t={t}>
      <Heading as="h1" style={textStyles.heading}>
        {t('verification.heading')}
      </Heading>
      <Text style={textStyles.body}>
        {userName
          ? t('verification.greeting', { name: userName })
          : t('verification.greetingGeneric')}
      </Text>
      <Text style={textStyles.body}>{t('verification.body')}</Text>
      <EmailButton href={actionUrl}>{t('verification.cta')}</EmailButton>
      <Text style={textStyles.fine}>{t('verification.expiry')}</Text>
    </BaseLayout>
  );
}

/** Localized subject line for the `verification` template — used by the registry & the queue row. */
export function verificationEmailSubject(locale: EmailLocale): string {
  return getEmailTranslator(locale)('verification.subject');
}
