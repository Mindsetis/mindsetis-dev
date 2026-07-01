import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Root middleware: locale routing (next-intl) composed with Supabase auth session
 * refresh. Order matters — resolve the locale-aware response first, then refresh the
 * Supabase cookies on top of it, so both the redirect/rewrite and the session survive.
 */
export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  return updateSession(request, response);
}

export const config = {
  matcher: [
    // Skip Next internals, static files, and API routes; run everywhere else
    // (including bare "/") so locale + auth handling apply consistently.
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)',
  ],
};
