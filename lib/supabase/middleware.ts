import type { CookieOptions } from '@supabase/ssr';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import type { NextRequest, NextResponse } from 'next/server';

// TODO(db-schema): once `npm run db:types` produces `lib/supabase/types.gen.ts`,
// import `Database` from there and pass it as the generic to `createServerClient`.

/**
 * Refreshes the Supabase auth session inside `middleware.ts`.
 *
 * Reads/writes auth cookies on both the incoming request and the outgoing response so
 * Server Components downstream see an up-to-date session. Must run on every request
 * that touches auth-gated routes. Returns the (refreshed) response together with the
 * current user so the caller can make routing decisions without a second `getUser()`.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<{ response: NextResponse; user: User | null }> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Touching `getUser()` triggers a token refresh when the access token is stale,
  // ensuring the refreshed cookies are written above before any RSC render runs.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
