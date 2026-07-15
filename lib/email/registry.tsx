import 'server-only';

import type { ReactElement } from 'react';

import type { EmailLocale, EmailTemplateKey, EmailTemplatePropsMap } from '@/lib/validation/email';

import { GenericEmail, genericEmailSubject } from './templates/generic-email';
import { PasswordResetEmail, passwordResetEmailSubject } from './templates/password-reset-email';
import { VerificationEmail, verificationEmailSubject } from './templates/verification-email';
import { WelcomeEmail, welcomeEmailSubject } from './templates/welcome-email';

export interface EmailTemplateDefinition<K extends EmailTemplateKey> {
  render(props: EmailTemplatePropsMap[K], locale: EmailLocale): ReactElement;
  subject(props: EmailTemplatePropsMap[K], locale: EmailLocale): string;
}

/**
 * `template_key` -> renderer registry. This indirection is the spec §5.14
 * "admin-manageable templates" extension point: today every entry is a hardcoded React
 * Email component + subject builder, but later an admin-stored override (fetched by
 * `templateKey` from a future `email_templates` content table) could replace either
 * `render` or `subject` here for a given key without touching `enqueueEmail`,
 * `email_messages`, or any caller.
 *
 * Keys match `email_messages.template_key` values written by `enqueueEmail` — see
 * `lib/validation/email.ts#emailTemplatePropsSchema` for the authoritative key list and
 * per-template prop validation.
 */
export const emailTemplateRegistry: { [K in EmailTemplateKey]: EmailTemplateDefinition<K> } = {
  verification: {
    render: (props, locale) => <VerificationEmail {...props} locale={locale} />,
    subject: (_props, locale) => verificationEmailSubject(locale),
  },
  password_reset: {
    render: (props, locale) => <PasswordResetEmail {...props} locale={locale} />,
    subject: (_props, locale) => passwordResetEmailSubject(locale),
  },
  generic: {
    render: (props, locale) => <GenericEmail {...props} locale={locale} />,
    subject: (props) => genericEmailSubject(props),
  },
  welcome: {
    render: (props, locale) => <WelcomeEmail {...props} locale={locale} />,
    subject: (_props, locale) => welcomeEmailSubject(locale),
  },
};
