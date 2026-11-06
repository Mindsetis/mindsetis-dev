import 'server-only';

import { getEmailTranslator } from '@/lib/email/i18n';
import { BaseLayout, EmailHeading, EmailText } from '@/lib/email/templates/base-layout';
import type { EmailLocale, SupportRequestEmailProps } from '@/lib/validation/email';

export type SupportRequestEmailComponentProps = SupportRequestEmailProps & {
  locale: EmailLocale;
};

/**
 * `support_request` template — an internal email to the Mindsetis team, not to the user, so its
 * copy is plain English constants rather than `email.*` dictionary keys (nothing here is ever
 * translated). Everything user-supplied (email, message, page, user agent) goes through React's
 * text escaping — never `dangerouslySetInnerHTML`.
 */
export function SupportRequestEmail({
  userId,
  userEmail,
  message,
  page,
  userAgent,
  uiLocale,
  locale,
}: SupportRequestEmailComponentProps) {
  const t = getEmailTranslator(locale);
  return (
    <BaseLayout previewText={`Help & Support — ${userEmail}`} t={t}>
      <EmailHeading>Help &amp; Support request</EmailHeading>
      <EmailText>
        <strong>From:</strong> {userEmail} (reply to this email to answer them directly)
      </EmailText>
      <EmailText>
        <strong>Message:</strong>
      </EmailText>
      <EmailText>
        <span style={{ whiteSpace: 'pre-wrap' }}>{message}</span>
      </EmailText>
      <EmailText variant="fine">
        User ID: {userId}
        <br />
        Page: {page || 'unknown'}
        <br />
        Device &amp; browser: {userAgent || 'unknown'}
        <br />
        UI language: {uiLocale}
      </EmailText>
    </BaseLayout>
  );
}

/** Subject for the `support_request` template. CR/LF stripped — the address is user-typed. */
export function supportRequestEmailSubject({ userEmail }: SupportRequestEmailProps): string {
  return `Help & Support — ${userEmail.replace(/[\r\n]+/g, ' ')}`;
}
