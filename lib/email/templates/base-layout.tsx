import 'server-only';

import { Body, Button, Container, Head, Hr, Html, Preview, Text } from '@react-email/components';
import type { ReactNode } from 'react';

import type { EmailTranslator } from '@/lib/email/i18n';

/**
 * Inline color tokens for email HTML (mirrors `app/globals.css` UI Kit tokens — dark
 * Masterclass/Netflix theme, cyan brand accent). Email clients (Gmail/Outlook/Apple Mail)
 * don't load app CSS or run Tailwind, so React Email compiles everything down to
 * table-based markup with literal inline `style` attributes; these values are duplicated
 * here on purpose rather than imported from the Tailwind theme.
 */
const colors = {
  background: '#000000',
  card: '#1a1a1a',
  foreground: '#ffffff',
  muted: '#a5a5a5',
  primary: '#79b9e3',
  primaryForeground: '#000000',
  border: '#333333',
} as const;

export interface BaseLayoutProps {
  /** Shown as the inbox preview snippet; not rendered in the body. */
  previewText: string;
  /** Translator scoped to the `email` namespace (see `lib/email/i18n.ts`) — supplies the shared footer copy. */
  t: EmailTranslator;
  children: ReactNode;
}

/**
 * Shared shell for every transactional email template (Stage 0.9 infra: header + content
 * slot + footer). New template types plug in by wrapping their content in `<BaseLayout>`
 * — see `verification-email.tsx` / `password-reset-email.tsx` / `generic-email.tsx` — so
 * chrome (brand header, unsubscribe/address footer) never has to be repeated per template.
 */
export function BaseLayout({ previewText, t, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body
        style={{
          backgroundColor: colors.background,
          margin: 0,
          padding: '32px 16px',
          fontFamily: 'Manrope, Helvetica, Arial, sans-serif',
        }}
      >
        <Container
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: '40px 32px',
            maxWidth: 480,
            margin: '0 auto',
          }}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 0.5,
              margin: '0 0 32px',
            }}
          >
            Mindsetis Community
          </Text>

          {children}

          <Hr style={{ borderColor: colors.border, margin: '32px 0 16px' }} />
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: '18px', margin: 0 }}>
            {t('footer.automated')}
          </Text>
          <Text
            style={{ color: colors.muted, fontSize: 12, lineHeight: '18px', margin: '4px 0 0' }}
          >
            {t('footer.address')} · {t('footer.unsubscribe')}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/** Brand-styled CTA button, shared by every template that needs one. */
export function EmailButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: colors.primary,
        color: colors.primaryForeground,
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 16,
        padding: '14px 32px',
        textDecoration: 'none',
        display: 'inline-block',
      }}
    >
      {children}
    </Button>
  );
}

/** Shared text styles for template body copy (heading/paragraph/fine-print). */
export const textStyles = {
  heading: { color: colors.foreground, fontSize: 24, fontWeight: 400, margin: '0 0 16px' },
  body: { color: colors.foreground, fontSize: 16, lineHeight: '24px', margin: '0 0 16px' },
  fine: { color: colors.muted, fontSize: 13, lineHeight: '20px', margin: '24px 0 0' },
} as const;
