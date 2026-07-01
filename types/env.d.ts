/**
 * Typed environment variables.
 *
 * Mirrors `.env.example`. Keep the two in sync when adding a variable.
 * NOTE: Google *sign-in* has no vars here — it is configured in the Supabase
 * dashboard (Auth → Providers → Google), not in app env. See docs/SUPABASE_SETUP.md.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    // App
    readonly NEXT_PUBLIC_SITE_URL: string;

    // Supabase (active)
    readonly NEXT_PUBLIC_SUPABASE_URL: string;
    // New-format keys (preferred).
    readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
    readonly SUPABASE_SECRET_KEY: string;
    // Legacy JWT keys (still valid; optional).
    readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    readonly SUPABASE_SERVICE_ROLE_KEY?: string;
    // CLI / migrations.
    readonly SUPABASE_PROJECT_REF?: string;
    readonly SUPABASE_DB_PASSWORD?: string;
    readonly SUPABASE_ACCESS_TOKEN?: string;

    // Stripe Connect (stage 1.5)
    readonly STRIPE_SECRET_KEY?: string;
    readonly NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
    readonly STRIPE_WEBHOOK_SECRET?: string;

    // Resend (stage 0.9)
    readonly RESEND_API_KEY?: string;
    readonly RESEND_FROM_EMAIL?: string;

    // OpenAI (stage 1.8)
    readonly OPENAI_API_KEY?: string;

    // Google Calendar / Meet — server-side API only (stage 1.4).
    // Google *login* is Supabase-managed and intentionally absent here.
    readonly GOOGLE_CALENDAR_CLIENT_EMAIL?: string;
    readonly GOOGLE_CALENDAR_PRIVATE_KEY?: string;

    // Upstash Redis (deferred)
    readonly UPSTASH_REDIS_REST_URL?: string;
    readonly UPSTASH_REDIS_REST_TOKEN?: string;
  }
}
