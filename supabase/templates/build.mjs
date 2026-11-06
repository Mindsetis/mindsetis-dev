/**
 * Generates the five Supabase Auth email templates in this folder.
 *
 *   node supabase/templates/build.mjs
 *
 * Why a generator: Supabase's dashboard takes ONE self-contained blob of HTML per
 * template — no includes, no partials — so the chrome (dark shell, wordmark, bulletproof
 * button, footer) would otherwise be copy-pasted five times and drift the first time
 * anyone edits it. The skeleton lives here once; the `.html` files next to it are build
 * output that gets pasted into the dashboard.
 *
 * Design tokens are copied from `lib/email/templates/base-layout.tsx` so these auth
 * emails and the Resend-queue emails look like the same product. They are duplicated on
 * purpose: this file must stay dependency-free plain HTML (no Tailwind, no React Email).
 *
 * See README.md in this folder for how to install the output and why the links use
 * `token_hash` rather than `{{ .ConfirmationURL }}`.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = dirname(fileURLToPath(import.meta.url));

// There is deliberately NO page-background token: since P12.2 (client request, 2026-10-30) the
// area around the card is transparent, so the reader's own mail background shows through (white in
// a light client, dark in a dark one). Only the card is painted. `card` is the site's real
// `--color-card` (app/styles/tokens/colors.css), not the #14181D the client gave as an example.
const c = {
  card: '#1a1a1a',
  foreground: '#ffffff',
  muted: '#a5a5a5',
  primary: '#79b9e3',
  primaryForeground: '#000000',
  border: '#333333',
};

const FONT = 'Manrope, Helvetica, Arial, sans-serif';

/** Card width cap. 600 is the usual email ceiling (Outlook reading pane, Gmail column). */
const CARD_WIDTH = 600;

/**
 * Colour + a same-colour gradient layer, as an inline-style fragment. Gmail's iOS/Android dark
 * mode rewrites `background-color` on emails it thinks need darkening but leaves
 * `background-image` alone, so the flat gradient keeps the brand colour pinned. Clients without
 * gradient support (Outlook desktop's Word engine) skip the second property and use the plain
 * colour (the card table also carries a `bgcolor` attribute for them). Not guaranteed in every
 * client - see README.md for what still needs a manual look.
 */
const pinned = (color) =>
  `background-color:${color};background-image:linear-gradient(${color},${color});`;

/**
 * Gmail iOS/Android dark-mode fix (client request, 2026-11-03: body text invisible - dark on our
 * dark card). Gmail recolours TEXT but keeps our pinned card background, so white text turns
 * near-black. Remi Parmentier's blend trick, scoped to Gmail by the `u + .body` selector (Gmail
 * rewrites <body class="body"> and inserts a <u> before it; no other client matches): text sits in
 * `.gmail-blend-screen > .gmail-blend-difference`. Gmail also inverts those black backgrounds to
 * white, so the inner `difference` layer (white minus the inverted text colour) recovers the
 * authored colour, and the outer `screen` layer is neutral for the black box over the card. With
 * no inversion (Gmail light mode) both layers are an identity. Clients without mix-blend-mode or
 * without the `u + .body` match ignore it and show the plain inline colour.
 * Keep in sync with `Blend` in lib/email/templates/base-layout.tsx.
 */
const blend = (inner) =>
  `<span class="gmail-blend-screen"><span class="gmail-blend-difference">${inner}</span></span>`;

/** Support address shown in every footer. Change here, rebuild, re-paste all five. */
const SUPPORT_EMAIL = 'support@mindsetis.com';

/**
 * Brand lockup for the header (Release-1 I4, delivered 2026-09-23).
 *
 * Served by the site itself — `public/email/logo-4df59990.png` — as
 * `{{ .SiteURL }}/email/logo-4df59990.png`: each Supabase project fills in its own Site URL
 * (Dashboard → Authentication → URL Configuration — set it WITHOUT a trailing slash), so dev
 * mail shows dev's copy and prod mail prod's. An email image needs an absolute HTTPS URL that
 * anyone can fetch without a session (the mail client, or Google's image proxy, opens it cold);
 * the middleware serves any path with a dot untouched, coming-soon mode included. It used to
 * live in the TEST project's Storage, which tied production mail to that project (moved
 * 06.11.2026, prod launch prep). A project whose Site URL is `http://localhost:3000` (the test
 * project) gets a broken logo — mail proxies can't reach localhost; acceptable for local testing.
 *
 * The filename carries a content hash. Mail proxies cache images hard and for a long time, so
 * a logo edited in place would keep showing the old artwork in inboxes for months. A new file
 * means a new URL means a new cache key — swap the file + this constant, rebuild, re-paste, done.
 *
 * The asset is 600×108 and rendered at 300 wide: 2× so it stays sharp on retina displays.
 */
const LOGO = {
  url: '{{ .SiteURL }}/email/logo-4df59990.png',
  width: 300,
  height: 54,
};

/**
 * Physical postal address. Transactional mail is not marketing, so CAN-SPAM's address
 * requirement does not strictly bite here — but Gmail/Outlook reputation scoring likes
 * seeing one, and the moment any of this copy turns promotional it becomes mandatory.
 * Left as an explicit placeholder rather than invented: ask the client for the real
 * registered address before the first production send.
 */
const POSTAL_ADDRESS = null; // e.g. 'Mindsetis OU, Some street 1, Tallinn, Estonia'

/**
 * Black-on-blue label everywhere except Gmail. Gmail's dark mode recolours a dark label on the
 * pinned blue too (a "blue minus blue = black" blend came out purple on iPhone, 05.11.2026), so in
 * Gmail — light and dark alike, it can't tell them apart — the button turns into the site's outline
 * style (dark fill, blue border; `u + .body .dm-btn` below) with a WHITE label inside the same
 * screen/difference wrapper as the body text, which Gmail renders correctly.
 */
const buttonLabel = (label) =>
  `<span class="gmail-blend-screen"><span class="gmail-blend-difference"><span class="gmail-btn-label dm-btn-text" style="color:${c.primaryForeground};">${label}</span></span></span>`;

function button(url, label) {
  return [
    '              <!--[if mso]>',
    `              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:50px;v-text-anchor:middle;width:260px;" arcsize="50%" stroke="f" fillcolor="${c.primary}">`,
    '                <w:anchorlock/>',
    `                <center style="color:${c.primaryForeground};font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;">${label}</center>`,
    '              </v:roundrect>',
    '              <![endif]-->',
    '              <!--[if !mso]><!-- -->',
    `              <a href="${url}" style="${pinned(c.primary)}border-radius:999px;color:${c.primaryForeground};display:inline-block;font-family:${FONT};font-size:16px;font-weight:700;line-height:22px;padding:14px 32px;text-decoration:none;mso-hide:all;" class="dm-btn">${buttonLabel(label)}</a>`,
    '              <!--<![endif]-->',
  ].join('\n');
}

/**
 * The visible, copy-pasteable duplicate of the link.
 *
 * Required by task I3, and not decoration: corporate mail gateways and some webmail
 * clients strip or rewrite anchor hrefs, and a button-only email is then a dead end. The
 * raw URL is also what a user forwards to support when something breaks. `word-break`
 * keeps the long token from blowing out the 480px container on mobile.
 */
function fallbackLink(url) {
  return [
    `            <p class="dm-muted" style="color:${c.muted};font-family:${FONT};font-size:13px;line-height:20px;margin:24px 0 0;">`,
    `              ${blend('Button not working? Copy and paste this link into your browser:')}`,
    '            </p>',
    '            <p style="margin:8px 0 0;">',
    `              ${blend(`<a href="${url}" class="dm-link" style="color:${c.primary};font-family:${FONT};font-size:13px;line-height:20px;text-decoration:underline;word-break:break-all;">${url}</a>`)}`,
    '            </p>',
  ].join('\n');
}

function footer() {
  const address = POSTAL_ADDRESS ? `${POSTAL_ADDRESS} &middot; ` : '';
  return [
    `            <hr style="border:0;border-top:1px solid ${c.border};margin:32px 0 16px;" />`,
    `            <p class="dm-muted" style="color:${c.muted};font-family:${FONT};font-size:12px;line-height:18px;margin:0;">`,
    `              ${blend(`Mindsetis Community &middot; ${address}Need help? Write to <a href="mailto:${SUPPORT_EMAIL}" class="dm-muted" style="color:${c.muted};text-decoration:underline;">${SUPPORT_EMAIL}</a>.`)}`,
    '            </p>',
  ].join('\n');
}

function buildDocument({ title, preheader, heading, paragraphs, ctaLabel, url, finePrint }) {
  const body = paragraphs
    .map(
      (p) =>
        `                <p class="dm-fg" style="color:${c.foreground};font-family:${FONT};font-size:16px;line-height:24px;margin:0 0 16px;">${blend(p)}</p>`,
    )
    .join('\n');

  // A run of &nbsp;&zwnj; after the preheader stops clients from dragging footer text
  // into the inbox preview line.
  const preheaderPad = '&nbsp;&zwnj;'.repeat(12);

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="x-apple-disable-message-reformatting" />
    <!-- The card is dark in every theme; the page around it is the client's own. "light dark"
         tells clients the email copes with both themes, so they should not recolour it. (A
         "dark"-only value would ask Apple Mail for a dark canvas even in light mode.) -->
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${title}</title>
    <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
    <![endif]-->
    <style>
      /* Only ever an enhancement - every rule that matters is also inline, because
         Gmail's webmail strips <style> in forwarded mail and Outlook.com rewrites it. */
      :root { color-scheme: light dark; supported-color-schemes: light dark; }
      body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
      img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
      a { color: ${c.primary}; }
      @media only screen and (max-width: 520px) {
        .m-pad { padding: 28px 20px !important; }
        .m-wrap { padding: 16px 8px !important; }
      }
      /* Gmail iOS/Android dark mode (see blend() in build.mjs). the u + .body selector only matches Gmail. */
      u + .body .gmail-blend-screen { background: #000; mix-blend-mode: screen; }
      u + .body .gmail-blend-difference { background: #000; mix-blend-mode: difference; }
      u + .body .dm-btn { background-color: ${c.card} !important; background-image: linear-gradient(${c.card}, ${c.card}) !important; border: 2px solid ${c.primary} !important; padding: 12px 30px !important; }
      u + .body .gmail-btn-label { color: ${c.foreground} !important; }
      /* Apple Mail dark */
      @media (prefers-color-scheme: dark) {
        .dm-card { background-color: ${c.card} !important; }
        .dm-fg { color: ${c.foreground} !important; }
        .dm-muted { color: ${c.muted} !important; }
        .dm-link { color: ${c.primary} !important; }
        .dm-btn { background-color: ${c.primary} !important; }
        .dm-btn-text { color: ${c.primaryForeground} !important; }
      }
      /* Outlook.com dark (ogsc = text colour, ogsb = background colour) */
      [data-ogsb] .dm-card { background-color: ${c.card} !important; }
      [data-ogsc] .dm-fg { color: ${c.foreground} !important; }
      [data-ogsc] .dm-muted { color: ${c.muted} !important; }
      [data-ogsc] .dm-link { color: ${c.primary} !important; }
      [data-ogsb] .dm-btn { background-color: ${c.primary} !important; }
      [data-ogsc] .dm-btn-text { color: ${c.primaryForeground} !important; }
    </style>
  </head>
  <body class="body" style="margin:0;padding:0;width:100%;">
    <div style="display:none;font-size:1px;color:${c.card};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
      ${preheader}${preheaderPad}
    </div>
    <!-- No background on <body> or this wrapper: the area around the card is transparent. -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
      <tr>
        <td class="m-wrap" align="center" style="padding:24px 16px;">
          <!-- THE CARD. The width ATTRIBUTE is what Outlook (Word engine) obeys, since it
               ignores max-width; every other client takes width:100% capped by max-width.
               border-collapse:separate is needed for border-radius on a table to show.
               bgcolor + background-color + same-colour gradient: see pinned() in build.mjs. -->
          <table role="presentation" width="${CARD_WIDTH}" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.card}" class="dm-card" style="width:100%;max-width:${CARD_WIDTH}px;margin:0 auto;border-collapse:separate;border-spacing:0;border:1px solid ${c.border};border-radius:12px;${pinned(c.card)}">
            <tr>
              <!-- radius 11 = the table's 12 minus its 1px border, so this cell's own
                   background does not poke past the rounded inner edge. -->
              <td class="m-pad" align="left" style="padding:40px 32px;border-radius:11px;${pinned(c.card)}">
                <!-- BRAND HEADER (task I4). The PNG has a transparent background (checked
                     2026-10-30: RGBA, corners alpha 0), so it sits cleanly on the dark card.
                     width/height are set as ATTRIBUTES as well as CSS because Outlook
                     ignores the CSS; without them it reserves the file's full 600px and the
                     card blows out. The alt text is styled to look like the wordmark it
                     replaces: a large share of readers see images blocked by default, and for
                     them this line IS the header, so it should still read as Mindsetis rather
                     than as a broken-image caption. -->
                <img
                  src="${LOGO.url}"
                  width="${LOGO.width}"
                  height="${LOGO.height}"
                  alt="Mindsetis"
                  style="display:block;border:0;outline:none;text-decoration:none;width:${LOGO.width}px;height:auto;max-width:100%;margin:0 0 32px;color:${c.primary};font-family:${FONT};font-size:20px;font-weight:700;letter-spacing:0.5px;"
                />

                <h1 class="dm-fg" style="color:${c.foreground};font-family:${FONT};font-size:24px;font-weight:400;line-height:32px;margin:0 0 16px;">
                  ${blend(heading)}
                </h1>

${body}

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;">
                  <tr>
                    <td align="left">
${button(url, ctaLabel)}
                    </td>
                  </tr>
                </table>

${fallbackLink(url)}

            <p class="dm-muted" style="color:${c.muted};font-family:${FONT};font-size:13px;line-height:20px;margin:24px 0 0;">
              ${blend(finePrint)}
            </p>

${footer()}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

/**
 * Link shape - see README.md and Release-1 task I6.
 *
 * `{{ .RedirectTo }}` is the `emailRedirectTo` / `redirectTo` the app passed from code
 * (`lib/auth/site-url.ts` -> `NEXT_PUBLIC_SITE_URL` + `/api/auth/confirm?next=...`). Using it
 * instead of a hardcoded `{{ .SiteURL }}` is what keeps a link generated from a developer's
 * machine pointing at `localhost:3000` while prod and dev point at their own origins - one
 * template, three environments, nothing to edit per project.
 *
 * It already carries `?next=...`, so the token is appended with `&`.
 *
 * THAT IS A CONTRACT, not an observation: every `emailRedirectTo` / `redirectTo` the app
 * passes MUST contain a query string, because `&` here is unconditional. Pass a bare
 * `/api/auth/confirm` and the rendered href becomes `/api/auth/confirm&token_hash=…`, which is
 * not a URL and silently sends every new signup to a dead link. This happened on 2026-09-23
 * while shortening the signup link and was caught only by sending a real email — the two call
 * sites (`(auth)/actions.ts`, `verify-email/actions.ts`) now carry `?next=/` and a warning.
 * Supabase templates have no conditional string handling, so this cannot be made defensive
 * here; it has to hold at the call site.
 *
 * The templates below with no code path behind them (change email, magic link, invite) have
 * no `.RedirectTo` to inherit and fall back to `{{ .SiteURL }}`, which is the project's Site
 * URL in Dashboard -> Authentication -> URL Configuration.
 */
const fromRedirectTo = (type) => `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=${type}`;
const fromSiteUrl = (type, next) =>
  `{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=${type}&next=${next}`;

const templates = {
  // Dashboard -> Authentication -> Emails -> Templates -> "Confirm signup"
  'confirm-signup.html': {
    title: 'Confirm your email',
    preheader: 'One click and your Mindsetis Community account is active.',
    heading: 'Confirm your email',
    paragraphs: [
      'Thanks for joining Mindsetis Community. Confirm your email address to activate your account and pick up where you left off.',
    ],
    ctaLabel: 'Confirm email',
    url: fromRedirectTo('signup'),
    finePrint:
      'This link can be used once and expires in 1 hour. If you did not create a Mindsetis Community account, you can safely ignore this email - nothing will happen.',
  },

  // Dashboard -> Authentication -> Emails -> Templates -> "Reset password"
  'reset-password.html': {
    title: 'Reset your password',
    preheader: 'Choose a new password for your Mindsetis Community account.',
    heading: 'Reset your password',
    paragraphs: [
      'We received a request to reset the password for your Mindsetis Community account. Click the button below to choose a new one.',
    ],
    ctaLabel: 'Reset password',
    url: fromRedirectTo('recovery'),
    finePrint:
      'This link can be used once and expires in 1 hour. If you did not ask to reset your password, you can safely ignore this email - your current password stays unchanged.',
  },

  // Dashboard -> Authentication -> Emails -> Templates -> "Change email address"
  'change-email.html': {
    title: 'Confirm your new email address',
    preheader: 'Confirm the new address for your Mindsetis Community account.',
    heading: 'Confirm your new email address',
    paragraphs: [
      'A request was made to change the email address on your Mindsetis Community account from {{ .Email }} to {{ .NewEmail }}.',
      'Confirm the change by clicking the button below.',
    ],
    ctaLabel: 'Confirm new address',
    url: fromSiteUrl('email_change', '/'),
    finePrint:
      'This link can be used once and expires in 1 hour. If you did not request this change, ignore this email and consider changing your password.',
  },

  // Dashboard -> Authentication -> Emails -> Templates -> "Magic link"
  'magic-link.html': {
    title: 'Your sign-in link',
    preheader: 'Your single-use link to sign in to Mindsetis Community.',
    heading: 'Sign in to Mindsetis Community',
    paragraphs: ['Click the button below to sign in. No password needed.'],
    ctaLabel: 'Sign in',
    url: fromSiteUrl('magiclink', '/dashboard'),
    finePrint:
      'This link can be used once and expires in 1 hour. If you did not try to sign in, you can safely ignore this email.',
  },

  // Dashboard -> Authentication -> Emails -> Templates -> "Invite user"
  'invite-user.html': {
    title: 'You have been invited',
    preheader: 'You have been invited to join Mindsetis Community.',
    heading: 'You have been invited to Mindsetis Community',
    paragraphs: [
      'Someone invited you to join Mindsetis Community - a member-first community of people worth talking to.',
      'Accept the invitation to set your password and create your profile.',
    ],
    ctaLabel: 'Accept invitation',
    url: fromSiteUrl('invite', '/member-profile'),
    // "no account will be created" was simply false and was caught in a live send
    // (2026-09-23): `auth.admin.inviteUserByEmail()` writes the user row immediately, so by
    // the time this email lands the account already exists — it just has no password. What
    // ignoring the invite actually buys the reader is that nobody can sign in as them, which
    // is what this now says.
    finePrint:
      'This invitation can be used once and expires in 1 hour. If you were not expecting it, you can safely ignore this email - without setting a password, nobody can sign in.',
  },
};

for (const [file, spec] of Object.entries(templates)) {
  writeFileSync(join(OUT_DIR, file), buildDocument(spec), 'utf8');
  console.log(`wrote ${file}`);
}
