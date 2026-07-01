import type { CookieOptions } from '@supabase/ssr';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// TODO(db-schema): once `npm run db:types` produces `lib/supabase/types.gen.ts`,
// import `Database` from there and pass it as the generic to `createServerClient`.

/**
 * Supabase client for RSC & SERVER ACTIONS (cookie-based session).
 *
 * Must be created per-request (reads the current `cookies()` store). Do NOT cache or
 * share a single instance across requests.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // `setAll` is called from a Server Component where cookies can't be
            // written. Safe to ignore when middleware refreshes the session.
          }
        },
      },
    },
  );
}
