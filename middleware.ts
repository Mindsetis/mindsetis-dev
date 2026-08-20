import type { CookieOptions } from '@supabase/ssr';
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

import { localePath, routing } from '@/i18n/routing';
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
 */
const AUTH_ONLY_PREFIXES = ['/login', '/sign-up', '/forgot-password'];

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
 * Root middleware: locale routing (next-intl) → Supabase session refresh → auth gating.
 * Order matters: resolve the locale-aware response first, refresh cookies on top of it,
 * then decide redirects using the freshly-resolved user.
 */
export default async function middleware(request: NextRequest): Promise<NextResponse> {
  const intlResponse = intlMiddleware(request);

  // If next-intl already wants to redirect (e.g. add a locale prefix), let it — auth
  // gating runs on the follow-up request that carries the locale. Still refresh cookies.
  if (intlResponse.headers.get('location')) {
    const { response } = await updateSession(request, intlResponse);
    return response;
  }

  const { response, user } = await updateSession(request, intlResponse);
  const { locale, rest } = splitLocale(request.nextUrl.pathname);

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
    url.pathname = localePath(locale, '/');
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next internals, static files, and API routes; run everywhere else
    // (including bare "/") so locale + auth handling apply consistently.
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)',
  ],
};
