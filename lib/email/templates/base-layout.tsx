import 'server-only';

import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from '@react-email/components';
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

const FONT = 'Manrope, Helvetica, Arial, sans-serif';

/**
 * Brand chrome shared with the Supabase Auth emails (`supabase/templates/build.mjs`, which keeps
 * its own dependency-free copy of these values — change both together). Both mail streams must
 * read as one product (client request, 2026-09-29: the queue emails still had a plain-text
 * wordmark and a different footer after the auth ones got the logo).
 *
 * The logo lives in Supabase Storage with a content-hashed name: an email image needs a public
 * absolute URL, and mail proxies cache hard, so a new artwork means a new filename. 600×81 file
 * rendered at 300 wide (2× for retina).
 */
const LOGO = {
  url: 'https://lslkbqoedrpnuwtqlvio.supabase.co/storage/v1/object/public/brand-assets/email/logo-25386c4b.png',
  width: 300,
  height: 41,
} as const;
const SUPPORT_EMAIL = 'support@mindsetis.com';

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
      <Head>
        {/* Dark by design — tell clients so they don't invert it a second time. */}
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
      </Head>
      <Preview>{previewText}</Preview>
      <Body
        style={{
          backgroundColor: colors.background,
          margin: 0,
          padding: '32px 16px',
          fontFamily: FONT,
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
          {/* Alt text styled as the old wordmark: many readers have images blocked by default,
              and for them this line IS the header. */}
          <Img
            src={LOGO.url}
            width={LOGO.width}
            height={LOGO.height}
            alt="Mindsetis"
            style={{
              display: 'block',
              border: 0,
              width: LOGO.width,
              height: 'auto',
              maxWidth: '100%',
              margin: '0 0 32px',
              color: colors.primary,
              fontFamily: FONT,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          />

          {children}

          <Hr style={{ borderColor: colors.border, margin: '32px 0 16px' }} />
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: '18px', margin: 0 }}>
            {t('footer.brand')} · {t('footer.help')}{' '}
            <Link
              href={`mailto:${SUPPORT_EMAIL}`}
              style={{ color: colors.muted, textDecoration: 'underline' }}
            >
              {SUPPORT_EMAIL}
            </Link>
            .
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
  heading: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: 400,
    lineHeight: '32px',
    margin: '0 0 16px',
  },
  body: { color: colors.foreground, fontSize: 16, lineHeight: '24px', margin: '0 0 16px' },
  fine: { color: colors.muted, fontSize: 13, lineHeight: '20px', margin: '24px 0 0' },
} as const;
