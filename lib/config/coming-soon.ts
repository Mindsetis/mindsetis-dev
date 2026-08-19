/**
 * THE PRE-LAUNCH SWITCH — one variable, two effects.
 *
 *   COMING_SOON_MODE="true"   the site is closed.  `/` shows the waitlist placeholder with
 *                             its minimal header/footer, and EVERY other route 307s back to
 *                             it. This is what dev and production run.
 *
 *   anything else (or unset)  the site is open.  `/` shows the full landing page (hero,
 *                             video, tour, email CTA) under the normal site chrome, and every
 *                             route is reachable under its usual auth rules. This is what you
 *                             want locally while building.
 *
 * WHY BOTH EFFECTS HANG OFF ONE FLAG
 *   They are the same product decision — "has the platform launched?" — and splitting them
 *   into two variables only creates combinations nobody wants (a placeholder homepage with a
 *   fully navigable site behind it, say). One flag, one mental model, one line to flip.
 *
 * WHO READS IT
 *   `middleware.ts` (the redirect) and `app/[locale]/page.tsx` (which homepage to render).
 *   Both go through this module rather than touching `process.env` themselves, so the two
 *   halves can never disagree about what the value means — a stray `"TRUE"` would otherwise
 *   silently close one half and open the other.
 *
 * EDGE-SAFE
 *   Plain `process.env` read with no Node built-ins, so the Edge-runtime middleware can
 *   import it as-is. Server-only in practice (the variable has no `NEXT_PUBLIC_` prefix, so
 *   it is never inlined into a client bundle) — but deliberately NOT marked `server-only`,
 *   which would break the middleware import.
 *
 * READ ONCE AT STARTUP
 *   This is a module-level constant, so flipping the variable needs a process restart
 *   (`npm run dev`) or a Vercel redeploy — editing the value alone changes nothing in a
 *   running server.
 */
export const COMING_SOON_MODE = process.env.COMING_SOON_MODE === 'true';
