import type { CookieOptions } from '@supabase/ssr';
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

import { localePath, routing } from '@/i18n/routing';
import { COMING_SOON_MODE } from '@/lib/config/coming-soon';
import { updateSession } from '@/lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Paths (locale-stripped) that require a signed-in user. Unauthenticated visitors are sent
 * to /login with a `redirectTo` back to where they were going. Expand in stage 0.7 (RBAC).
 *
 * `/member-profile` (registration wizard step 3/4) and `/build-profile` (step 4/4) write to
 * the caller's own `profiles` row (the latter also sends the welcome email for their own
 * account), so both need a signed-in user like the rest of this list —
 * defense-in-depth on top of each page's own `getSessionContext()` redirect and the Server
 * Action's `requireUser()`. `/verify-email` (step 2/4) is intentionally NOT in this list: it's
 * reached with no session at all (that's the point of the gate), so it must stay public.
 *
 * `/mindsetter-onboarding` (extended Mindsetter onboarding, ROADMAP stage 1.9) reads/writes
 * the caller's own `mindsetter_profiles` row the same way — same defense-in-depth precedent.
 */
const PROTECTED_PREFIXES = [
  '/account',
  '/dashboard',
  '/settings',
  '/member-profile',
  '/build-profile',
  '/mindsetter-onboarding',
  // `/continue` resolves "where did I leave off?" from the caller's own stored progress and
  // forwards — meaningless without a session, and gating it here is what keeps
  // `resolveOnboardingRedirect()`'s `/login` branch from ping-ponging against the AUTH_ONLY
  // bounce below (an anonymous caller never reaches the resolver at all).
  '/continue',
  // `/join-applied` — the Release-1 A5 "you've already applied" modal, reached only via
  // `/continue`'s `from=join` branch (see that page's doc comment). Deliberately named with a
  // HYPHEN rather than nested at `/join/applied`: `/join` sits in `AUTH_ONLY_PREFIXES` below
  // with prefix matching (`matchesPrefix`), so a `/join/applied` child would itself match
  // `/join` and bounce straight back to `/continue` — the exact redirect loop this feature has
  // to avoid. `/join-applied` does not start with `/join/`, so it never matches that prefix.
  // Listed here too (not just checked inside the page) so an anonymous caller who guesses the
  // URL is bounced to `/login` before rendering, same defense-in-depth as every other entry.
  '/join-applied',
  // `/members/[username]` (Member profile view, stage 1.6 — renamed from `/profile/[username]`,
  // then from `/member/[username]`): visible to any REGISTERED member, not anonymous visitors —
  // product decision, deliberately not restricted to the profile's own owner (the owner just
  // gets the `preview` banner there instead of a separate self-view route). Mindsetters are
  // redirected off it to the unauthenticated-public spec-§5.4 `/mindsetters/[username]`, which
  // is NOT in this list. Distinct from `/member-profile` above (the registration-wizard
  // editing form) — `matchesPrefix` requires an exact match or a `/` boundary, so the two
  // prefixes don't collide.
  '/members',
];

/**
 * Auth-only paths a signed-in user shouldn't see (already authenticated). Note: NOT
 * `/reset-password` — that needs the recovery session, so signed-in users must reach it.
 *
 * These used to bounce to `/`, which is the dead end the client reported: someone who started
 * the registration and didn't finish clicked "Apply to Join", landed on the homepage, and got
 * no hint that their application was half-done. They now bounce to `/continue`, which reads
 * their actual progress and forwards (Release-1 A1).
 *
 * `/join` is in this list because it is where every "Apply to Join" CTA actually points — the
 * header's, the hero band's and the "What is Mindsetis" one. It is an email-capture page for
 * people who don't have an account yet, so showing it to someone who is already signed in is
 * the dead end itself, not a step towards fixing it.
 *
 * Gating it HERE rather than inside `join/page.tsx` keeps that page prerendered for the
 * anonymous visitors it exists for: the middleware already knows whether there is a session,
 * so no database read and no per-request rendering is added to a marketing page.
 *
 * RESOLVED for Release-1 A5: the client wants a modal ("You've already applied and logged in
 * as…") for a visitor whose profile is already COMPLETE, and a silent redirect for everyone
 * else. Solved by passing the origin to `/continue` (`?from=join`, set only when the matched
 * prefix is `/join` — see the bounce below) and letting `/continue` branch: a completed
 * profile arriving `from=join` is sent to `/join-applied` (a separate protected route, see
 * `PROTECTED_PREFIXES` above) instead of the cabinet; everyone else is unaffected. `/join`
 * itself was deliberately NOT dropped from this list — that would reopen the dead end A1
 * closed (a half-finished visitor landing back in the funnel).
 */
const AUTH_ONLY_PREFIXES = ['/login', '/sign-up', '/forgot-password', '/join'];

/** Where a signed-in visitor to an AUTH_ONLY path is sent instead. */
const CONTINUE_PATH = '/continue';

/**
 * Staff-only paths (back-office). Gated on a `staff_roles` row, not just being signed in.
 * This is defense-in-depth ONLY — the real enforcement is `requireStaff()` at the page/
 * Server Action level (see `lib/auth/guards.ts`), since middleware can't safely branch on
 * `minRole` per-route and RLS is the actual data boundary.
 */
const STAFF_PREFIXES = ['/admin'];

/** True when `userId` has a row in `staff_roles` (admin or moderator). */
async function isStaffUser(
  request: NextRequest,
  response: NextResponse,
  userId: string,
): Promise<boolean> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );
  // RLS policy `staff_roles_read_own_or_staff` lets the signed-in user read their own row;
  // the explicit `.eq` keeps this a single-row lookup even for staff (whose policy branch
  // additionally allows reading *all* rows).
  const { data } = await supabase
    .from('staff_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  return Boolean(data);
}

/** Split `/en/account/x` → `{ locale: 'en', rest: '/account/x' }`. */
function splitLocale(pathname: string): { locale: string; rest: string } {
  const [, maybeLocale, ...segments] = pathname.split('/');
  if (maybeLocale && routing.locales.includes(maybeLocale as (typeof routing.locales)[number])) {
    return { locale: maybeLocale, rest: `/${segments.join('/')}` };
  }
  return { locale: routing.defaultLocale, rest: pathname };
}

function matchesPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * HTTP Basic Auth realm shown in the browser's password prompt.
 */
const BASIC_AUTH_REALM = 'Mindsetis';

/**
 * Length-independent comparison that does not bail on the first differing byte.
 *
 * `crypto.timingSafeEqual` does not exist in the Edge runtime this middleware runs in, and a
 * plain `===` leaks how many leading characters were correct through response timing. The
 * risk against a holding-page password is remote, but the fix is five lines.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Decode a base64 Basic-Auth payload as UTF-8.
 *
 * `Buffer` is not available in the Edge runtime, and bare `atob` yields a binary string that
 * mangles any non-ASCII character — so a password containing, say, "ї" would never match.
 * Going through `Uint8Array` + `TextDecoder` handles the full range, and the `charset="UTF-8"`
 * hint on the challenge below asks browsers to encode it the same way.
 */
function decodeBase64Utf8(value: string): string {
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

/**
 * Site-wide HTTP Basic Auth gate — returns a 401 challenge to close the site, or `null` to
 * let the request through to the pipeline below.
 *
 * WHY IN CODE AND NOT IN VERCEL
 *   Vercel's built-in Deployment Protection does exactly this, but password protection is a
 *   paid add-on (~$150/month) on top of Pro — not worth it to hide a pre-launch site. This
 *   is the same thing in ~40 lines, free on any plan.
 *
 * NOT SECURITY — ACCESS CONTROL
 *   One shared password for everyone, sent base64-encoded (encoding, not encryption). It is
 *   only meaningful over HTTPS, which Vercel always provides. It keeps the site away from
 *   casual visitors and crawlers before launch; it is NOT a substitute for the app's real
 *   Supabase authentication, which runs underneath it (see the prefix lists above).
 *
 * ENABLED BY ENVIRONMENT, NOT BY CODE
 *   The gate activates only when `SITE_AUTH_PASSWORD` is set. Locally that variable does not
 *   exist, so `npm run dev` is never gated, and lifting the gate at launch is deleting one
 *   Vercel environment variable — no commit, no redeploy of changed source.
 *
 * Distinct from `COMING_SOON_MODE` below and deliberately kept separate: this hides the WHOLE
 * origin from everyone without the password, while the coming-soon gate leaves the homepage
 * placeholder publicly readable and only folds the rest of the site into it. They compose —
 * password-gated pre-launch now, public placeholder later, full site last.
 */
function basicAuthChallenge(request: NextRequest): NextResponse | null {
  const expectedPassword = process.env.SITE_AUTH_PASSWORD;
  const expectedUser = process.env.SITE_AUTH_USER ?? '';

  // Not configured — local development, and any deployment where the gate is deliberately
  // lifted. Open, on purpose.
  if (!expectedPassword) return null;

  const header = request.headers.get('authorization');

  if (header?.startsWith('Basic ')) {
    const decoded = decodeBase64Utf8(header.slice('Basic '.length));
    const separator = decoded.indexOf(':');
    if (separator !== -1) {
      const user = decoded.slice(0, separator);
      const password = decoded.slice(separator + 1);
      // An unset SITE_AUTH_USER means "any username" — browsers still render two fields, and
      // forcing a username people have to remember adds nothing to a shared password.
      const userMatches = expectedUser === '' || safeEqual(user, expectedUser);
      if (userMatches && safeEqual(password, expectedPassword)) {
        return null;
      }
    }
  }

  return new NextResponse('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${BASIC_AUTH_REALM}", charset="UTF-8"`,
      // Never let a proxy or CDN cache the challenge or an authorised response.
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * Paths the locale/session pipeline must never touch — Next internals, static files, and
 * Route Handlers. These used to be carved out by the `matcher` regex at the bottom, but the
 * Basic-Auth gate has to see EVERY request (a closed site must not serve its assets either),
 * so the matcher now takes everything and this exclusion happens one step later, immediately
 * after the gate. The conditions mirror the previous matcher exactly.
 */
function isPipelineExempt(pathname: string): boolean {
  const rest = pathname.slice(1);
  return (
    rest.startsWith('_next/static') ||
    rest.startsWith('_next/image') ||
    rest.startsWith('favicon.ico') ||
    rest.startsWith('api') ||
    rest.includes('.')
  );
}

/**
 * Root middleware: Basic Auth gate → locale routing (next-intl) → Supabase session refresh →
 * coming-soon gate → auth gating. Order matters: the password gate runs before anything else
 * (a closed site reveals nothing, not even a redirect or a locale cookie), then the
 * locale-aware response is resolved, cookies refreshed on top of it, and only then are
 * redirects decided using the freshly-resolved user.
 */
export default async function middleware(request: NextRequest): Promise<NextResponse> {
  const challenge = basicAuthChallenge(request);
  if (challenge) return challenge;

  // Past the gate, static assets and Route Handlers skip the locale/session pipeline — they
  // were never part of it (see `isPipelineExempt`).
  if (isPipelineExempt(request.nextUrl.pathname)) return NextResponse.next();

  const intlResponse = intlMiddleware(request);

  // If next-intl already wants to redirect (e.g. add a locale prefix), let it — auth
  // gating runs on the follow-up request that carries the locale. Still refresh cookies.
  if (intlResponse.headers.get('location')) {
    const { response } = await updateSession(request, intlResponse);
    return response;
  }

  const { response, user } = await updateSession(request, intlResponse);
  const { locale, rest } = splitLocale(request.nextUrl.pathname);

  // Pre-launch gate: everything but the homepage bounces back to it. The other half of this
  // switch lives in `app/[locale]/page.tsx` (which homepage to render) — see
  // `lib/config/coming-soon.ts`.
  if (COMING_SOON_MODE && rest !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = localePath(locale, '/');
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (!user && matchesPrefix(rest, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = localePath(locale, '/login');
    url.search = '';
    url.searchParams.set('redirectTo', rest);
    return NextResponse.redirect(url);
  }

  // Defense-in-depth only: the real enforcement is `requireStaff()` (see
  // `lib/auth/guards.ts`) at the page/Server Action level, backed by RLS. This just keeps
  // non-staff visitors from ever rendering the back-office shell. Scoped to `/admin` so
  // normal routes never pay for the extra `staff_roles` lookup.
  if (matchesPrefix(rest, STAFF_PREFIXES)) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = localePath(locale, '/login');
      url.search = '';
      url.searchParams.set('redirectTo', rest);
      return NextResponse.redirect(url);
    }
    const isStaff = await isStaffUser(request, response, user.id);
    if (!isStaff) {
      const url = request.nextUrl.clone();
      url.pathname = localePath(locale, '/');
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  if (user && matchesPrefix(rest, AUTH_ONLY_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = localePath(locale, CONTINUE_PATH);
    url.search = '';
    // Tag the origin so `/continue` can special-case A5's "already applied" modal for a
    // completed profile without affecting the other three AUTH_ONLY paths (`/login`,
    // `/sign-up`, `/forgot-password`), which have no equivalent modal and must keep landing in
    // the cabinet like before.
    if (matchesPrefix(rest, ['/join'])) {
      url.searchParams.set('from', 'join');
    }
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // EVERYTHING, static assets and Route Handlers included — "the site is closed" has to
    // mean the whole origin, so the Basic-Auth gate must see every request. The old
    // Next-internals/static/api carve-out still applies to the locale + auth pipeline; it
    // just moved inside the handler (`isPipelineExempt`), one step after the gate.
    '/(.*)',
  ],
};
