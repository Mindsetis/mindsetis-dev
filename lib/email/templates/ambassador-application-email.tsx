import 'server-only';

import { getEmailTranslator } from '@/lib/email/i18n';
import {
  BaseLayout,
  EmailButton,
  EmailHeading,
  EmailText,
} from '@/lib/email/templates/base-layout';
import type { AmbassadorApplicationEmailProps, EmailLocale } from '@/lib/validation/email';

export type AmbassadorApplicationEmailComponentProps = AmbassadorApplicationEmailProps & {
  locale: EmailLocale;
};

/**
 * `ambassador_application` template — receipt sent right after the homepage "Apply for
 * Ambassadorship" popup is submitted (`submitAmbassadorApplication`, `app/[locale]/actions.ts`).
 *
 * Both audiences get "we'll review your application and get back to you". A guest (no account)
 * additionally gets the requirement the client asked for: an Ambassador must have an account, so
 * they are told to register with THIS email — that is what lets the database link the
 * application to their profile once the address is confirmed (see the migration's trigger).
 * `isGuest` means "has no account yet": a signed-out applicant whose address is already
 * registered gets the short version too (the action decides, 05.11.2026).
 */
export function AmbassadorApplicationEmail({
  userName,
  isGuest,
  signUpUrl,
  locale,
}: AmbassadorApplicationEmailComponentProps) {
  const t = getEmailTranslator(locale);
  return (
    <BaseLayout previewText={t('ambassadorApplication.heading')} t={t}>
      <EmailHeading>{t('ambassadorApplication.heading')}</EmailHeading>
      <EmailText>
        {userName
          ? t('ambassadorApplication.greeting', { name: userName })
          : t('ambassadorApplication.greetingGeneric')}
      </EmailText>
      <EmailText>{t('ambassadorApplication.body')}</EmailText>
      {isGuest ? (
        <>
          <EmailText>{t('ambassadorApplication.guestRegister')}</EmailText>
          {signUpUrl ? (
            <EmailButton href={signUpUrl}>{t('ambassadorApplication.guestCta')}</EmailButton>
          ) : null}
        </>
      ) : null}
    </BaseLayout>
  );
}

/** Localized subject line for the `ambassador_application` template. */
export function ambassadorApplicationEmailSubject(locale: EmailLocale): string {
  return getEmailTranslator(locale)('ambassadorApplication.subject');
}
