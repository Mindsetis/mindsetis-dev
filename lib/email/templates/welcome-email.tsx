import 'server-only';

import { Heading, Text } from '@react-email/components';

import { getEmailTranslator } from '@/lib/email/i18n';
import { BaseLayout, EmailButton, textStyles } from '@/lib/email/templates/base-layout';
import type { EmailLocale, WelcomeEmailProps } from '@/lib/validation/email';

export type WelcomeEmailComponentProps = WelcomeEmailProps & { locale: EmailLocale };

/**
 * `welcome` template — post-signup informational/receipt email (registration wizard step 3,
 * `app/[locale]/build-profile/actions.ts`; re-sendable from step 4's "Resend email" button,
 * `app/[locale]/verify-email/actions.ts`).
 *
 * Ordinary "welcome" copy, NOT a confirmation gate: the account is auto-confirmed at signup
 * (`admin.createUser({ email_confirm: true })`, see `(auth)/actions.ts#signUp`'s doc comment)
 * and already has a live session by the time this is sent, so `actionUrl` is a plain link
 * back to the Congrats screen (`/welcome`) — clicking it (or not) never gates anything, unlike
 * the `verification` template above.
 */
export function WelcomeEmail({ actionUrl, userName, locale }: WelcomeEmailComponentProps) {
  const t = getEmailTranslator(locale);
  return (
    <BaseLayout previewText={t('welcome.heading')} t={t}>
      <Heading as="h1" style={textStyles.heading}>
        {t('welcome.heading')}
      </Heading>
      <Text style={textStyles.body}>
        {userName ? t('welcome.greeting', { name: userName }) : t('welcome.greetingGeneric')}
      </Text>
      <Text style={textStyles.body}>{t('welcome.body')}</Text>
      <EmailButton href={actionUrl}>{t('welcome.cta')}</EmailButton>
    </BaseLayout>
  );
}

/** Localized subject line for the `welcome` template — used by the registry & the queue row. */
export function welcomeEmailSubject(locale: EmailLocale): string {
  return getEmailTranslator(locale)('welcome.subject');
}
