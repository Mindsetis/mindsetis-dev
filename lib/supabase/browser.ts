import { createBrowserClient } from '@supabase/ssr';

// TODO(db-schema): once `npm run db:types` produces `lib/supabase/types.gen.ts`,
// import `Database` from there and pass it as the generic to `createBrowserClient`.

/**
 * Supabase client for CLIENT COMPONENTS only.
 *
 * Uses the public anon/publishable key — safe to ship to the browser. Never import
 * `lib/supabase/service.ts` here or in any file that reaches the client bundle.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
