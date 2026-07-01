import 'server-only';

import { Heading, Text } from '@react-email/components';

import { getEmailTranslator } from '@/lib/email/i18n';
import { BaseLayout, EmailButton, textStyles } from '@/lib/email/templates/base-layout';
import type { EmailLocale, GenericEmailProps } from '@/lib/validation/email';

export type GenericEmailComponentProps = GenericEmailProps & { locale: EmailLocale };

/**
 * `generic` template — free-form heading/body/CTA for one-off or future admin-composed
 * sends (spec §5.14 admin-manageable templates). Unlike `verification`/`password_reset`,
 * the copy is caller-supplied rather than pulled from the `email` i18n namespace — only
 * the shared `<BaseLayout>` chrome (header/footer) is localized.
 */
export function GenericEmail({
  heading,
  body,
  actionUrl,
  actionLabel,
  locale,
}: GenericEmailComponentProps) {
  const t = getEmailTranslator(locale);
  return (
    <BaseLayout previewText={heading} t={t}>
      <Heading as="h1" style={textStyles.heading}>
        {heading}
      </Heading>
      <Text style={textStyles.body}>{body}</Text>
      {actionUrl && actionLabel ? <EmailButton href={actionUrl}>{actionLabel}</EmailButton> : null}
    </BaseLayout>
  );
}

/** Subject line for the `generic` template — the caller-supplied heading, verbatim. */
export function genericEmailSubject(props: GenericEmailProps): string {
  return props.heading;
}
