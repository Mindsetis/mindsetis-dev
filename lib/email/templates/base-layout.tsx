import 'server-only';

import { Body, Button, Head, Hr, Html, Img, Link, Preview, Text } from '@react-email/components';
import type { ReactNode } from 'react';

import type { EmailTranslator } from '@/lib/email/i18n';

/**
 * Inline color tokens for email HTML (mirrors `app/styles/tokens/colors.css` UI Kit tokens —
 * dark Masterclass/Netflix theme, cyan brand accent). Email clients (Gmail/Outlook/Apple Mail)
 * don't load app CSS or run Tailwind, so React Email compiles everything down to
 * table-based markup with literal inline `style` attributes; these values are duplicated
 * here on purpose rather than imported from the Tailwind theme.
 *
 * There is deliberately NO page background token: since P12.2 (client request, 2026-10-30) the
 * area around the card is transparent, so the reader's own mail background shows through
 * (white in a light client, dark in a dark one). Only the card is painted. `card` is the site's
 * real `--color-card` (#1a1a1a), not the #14181D the client suggested as an example.
 * `border` is the same #333 as the footer rule - the card needs a hairline because on a dark
 * client background it is barely lighter/darker than the page.
 */
const colors = {
  card: '#1a1a1a',
  foreground: '#ffffff',
  muted: '#a5a5a5',
  primary: '#79b9e3',
  primaryForeground: '#000000',
  border: '#333333',
} as const;

const FONT = 'Manrope, Helvetica, Arial, sans-serif';

/** Card width cap (client brief: up to 600). 600 is also the usual email ceiling. */
const CARD_WIDTH = 600;

/**
 * Colour + a same-colour gradient layer. Gmail's iOS/Android dark mode rewrites
 * `background-color` on emails it thinks need darkening, but leaves `background-image` alone, so
 * a flat gradient on top keeps the brand colour pinned. Clients that do not support gradients
 * (Outlook desktop's Word engine) ignore the second property and use the plain colour (card also
 * carries a `bgcolor` attribute for them). Best effort, not guaranteed everywhere - the clients
 * that still need a manual look are listed in `supabase/templates/README.md`.
 */
function pinnedBackground(color: string) {
  return {
    backgroundColor: color,
    backgroundImage: `linear-gradient(${color}, ${color})`,
  } as const;
}

/**
 * Head `<style>`: an enhancement only - every rule that matters is also inline (Gmail drops
 * <style> for some account types). `color-scheme: light dark` says "this email copes with both
 * themes, do not recolour it": the card stays dark either way and the page around it follows the
 * client. (The previous `dark`-only value would have asked Apple Mail for a dark canvas even in
 * light mode, which contradicts the transparent surround.) No quotes or angle brackets inside, so
 * React's text escaping leaves the CSS intact.
 */
const HEAD_CSS = `
:root { color-scheme: light dark; supported-color-schemes: light dark; }
body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
@media only screen and (max-width: 520px) {
  .m-wrap { padding: 16px 8px !important; }
  .m-pad { padding: 28px 20px !important; }
}
`;

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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Card is dark in every theme; the surround is the client's. See HEAD_CSS. */}
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{HEAD_CSS}</style>
      </Head>
      <Preview>{previewText}</Preview>
      {/* No background on <body> or the wrapper: the area around the card is transparent. */}
      <Body style={{ margin: 0, padding: 0, width: '100%', fontFamily: FONT }}>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          style={{ width: '100%' }}
        >
          <tbody>
            <tr>
              <td className="m-wrap" align="center" style={{ padding: '24px 16px' }}>
                {/* The card. `width` ATTRIBUTE = 600 is what Outlook (Word engine) obeys, since it
                    ignores max-width; every other client takes `width:100%` capped by `max-width`.
                    `border-collapse: separate` is required for border-radius on a table to show.
                    `bgcolor` + background-color + same-colour gradient: see pinnedBackground(). */}
                <table
                  role="presentation"
                  width={CARD_WIDTH}
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  bgcolor={colors.card}
                  style={{
                    width: '100%',
                    maxWidth: CARD_WIDTH,
                    margin: '0 auto',
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    ...pinnedBackground(colors.card),
                  }}
                >
                  <tbody>
                    <tr>
                      {/* radius 11 = the table's 12 minus its 1px border, so this cell's own
                          background does not poke past the rounded inner edge. */}
                      <td
                        className="m-pad"
                        align="left"
                        style={{
                          padding: '40px 32px',
                          borderRadius: 11,
                          ...pinnedBackground(colors.card),
                        }}
                      >
                        {/* Logo: transparent PNG + alt text styled as the old wordmark - many
                            readers have images blocked by default, and for them this line IS the
                            header. */}
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
                        <Text
                          style={{
                            color: colors.muted,
                            fontSize: 12,
                            lineHeight: '18px',
                            margin: 0,
                          }}
                        >
                          {t('footer.brand')} · {t('footer.help')}{' '}
                          <Link
                            href={`mailto:${SUPPORT_EMAIL}`}
                            style={{ color: colors.muted, textDecoration: 'underline' }}
                          >
                            {SUPPORT_EMAIL}
                          </Link>
                          .
                        </Text>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
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
        // Same pinning as the card, so Gmail dark mode does not recolour the button.
        ...pinnedBackground(colors.primary),
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
