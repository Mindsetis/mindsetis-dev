/**
 * SEARCH-ENGINE INDEXING — the production origin only.
 *
 * The site is `noindex` everywhere except the homepage: `app/[locale]/layout.tsx` sets
 * `robots: { index: false, follow: false }` site-wide and `app/[locale]/page.tsx` opts `/`
 * back in, with `app/robots.ts` + `app/sitemap.ts` saying the same thing to crawlers. That
 * single opt-in is right on production and wrong everywhere else: the dev Vercel project and
 * every preview deployment build the SAME homepage from the SAME repo, so without this guard
 * `mindsetis-dev.vercel.app` competes with the real domain for identical content and can land
 * in search results months before launch.
 *
 * A deployment may be indexed only when ALL of these hold:
 *
 *   - `NOINDEX` is not exactly `"true"`. The explicit override, needed for a non-production
 *     deployment that runs on a REAL custom domain (`dev.mindsetis.com`), which the host check
 *     below cannot recognise on its own. Set it in that project's Vercel env vars.
 *   - `NEXT_PUBLIC_SITE_URL` is set and parses as a URL. An unset or malformed value means the
 *     deployment is misconfigured; refusing to be indexed is the safe reading of "unknown".
 *   - its host is not `*.vercel.app`. This is what makes the dev project and every preview URL
 *     `noindex` with NO env var set anywhere — including on deployments that already exist.
 *   - its host is not localhost (`npm run dev` is never a crawl target anyway, but the same
 *     rule keeps `robots.txt` honest locally).
 *
 * Production is unaffected: it serves a real domain and sets no `NOINDEX`, so this evaluates
 * to `true` there exactly as before.
 *
 * Read ONCE at startup, like `COMING_SOON_MODE` (see `lib/config/coming-soon.ts`) — editing
 * the value in a dashboard changes nothing in a running server, it needs a redeploy. And
 * because `NEXT_PUBLIC_SITE_URL` is inlined at BUILD time, that redeploy must rebuild rather
 * than reuse a cached build.
 *
 * NOT a security boundary. `robots.txt` and `<meta name="robots">` are requests that
 * well-behaved crawlers honour; they hide nothing from anyone who visits the URL. The actual
 * pre-launch lock is `SITE_AUTH_PASSWORD` in `middleware.ts`, which 401s the whole origin —
 * this guard is what protects deployments that deliberately stay open.
 */
function computeIndexingAllowed(): boolean {
  if (process.env.NOINDEX === 'true') return false;

  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) return false;

  let host: string;
  try {
    host = new URL(base).hostname.toLowerCase();
  } catch {
    return false;
  }

  if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1') return false;
  if (host === 'vercel.app' || host.endsWith('.vercel.app')) return false;

  return true;
}

export const INDEXING_ALLOWED = computeIndexingAllowed();
