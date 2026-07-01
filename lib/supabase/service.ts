import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// TODO(db-schema): once `npm run db:types` produces `lib/supabase/types.gen.ts`,
// import `Database` from there and pass it as the generic to `createSupabaseClient`.

/**
 * Supabase SERVICE ROLE client — server-only.
 *
 * Bypasses RLS. Use exclusively from Server Actions, Route Handlers, and Edge
 * Functions that need to write money tables (`transactions`, `payouts`) or perform
 * staff-only mutations (verification status, staff roles). NEVER import this module
 * from a client component or anything bundled for the browser — the `server-only`
 * import above makes accidental client bundling a build-time error.
 */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
