import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

import { routing } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { safeRedirectPath } from '@/lib/validation/common';

/**
 * Email link handler — establishes the session for BOTH of this project's Supabase Auth email
 * links:
 *
 *   • Password resets: `requestPasswordReset` (`app/[locale]/(auth)/actions.ts`) points
 *     `redirectTo` here with `?next=/reset-password`.
 *   • Sign-up confirmation (stage 1.5): `signUp()` / `resendConfirmationEmail()` pass
 *     `emailRedirectTo = …/api/auth/confirm?next=/member-profile`. With custom SMTP OFF on the
 *     hosted project, Supabase's default "Confirm signup" template `{{ .ConfirmationURL }}`
 *     verifies the token server-side then redirects here with the PKCE `?code=` (handled by the
 *     `exchangeCodeForSession` branch below), so a confirmed visitor lands straight on the
 *     wizard's step 3. Establishing the session here is what makes `/verify-email` (step 2) a
 *     real blocking gate rather than the informational screen it used to be. (If a custom,
 *     editable template is ever restored, a `?token_hash=&type=` link hits the `verifyOtp`
 *     branch instead — both paths are supported.)
 *
 * Lives under `/api` so the i18n middleware doesn't rewrite it (see `middleware.ts` matcher).
 * Supports both Supabase link styles:
 *
 *   • `?token_hash=…&type=…`  → verifyOtp (recommended email-template style)
 *   • `?code=…`               → exchangeCodeForSession (PKCE / default ConfirmationURL)
 *
 * On success it redirects to `next` (a safe relative path), prefixed with the default
 * locale so the localized app renders without an extra redirect hop.
 */

function localized(path: string, origin: string): URL {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return new URL(`/${routing.defaultLocale}${clean === '/' ? '' : clean}`, origin);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const next = safeRedirectPath(searchParams.get('next'));
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(localized(next, origin));
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(localized(next, origin));
    }
  }

  // Anything else (missing/expired/invalid token) → back to login with an error banner.
  const errorUrl = localized('/login', origin);
  errorUrl.searchParams.set('error', 'invalid_link');
  return NextResponse.redirect(errorUrl);
}
