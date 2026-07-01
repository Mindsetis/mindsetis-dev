import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Paths (locale-stripped) that require a signed-in user. Unauthenticated visitors are sent
 * to /login with a `redirectTo` back to where they were going. Expand in stage 0.7 (RBAC).
 */
const PROTECTED_PREFIXES = ['/account', '/dashboard', '/settings'];

/**
 * Auth-only paths a signed-in user shouldn't see (already authenticated). Note: NOT
 * `/reset-password` — that needs the recovery session, so signed-in users must reach it.
 */
const AUTH_ONLY_PREFIXES = ['/login', '/sign-up', '/forgot-password'];

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
    url.pathname = `/${locale}/login`;
    url.search = '';
    url.searchParams.set('redirectTo', rest);
    return NextResponse.redirect(url);
  }

  if (user && matchesPrefix(rest, AUTH_ONLY_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
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
