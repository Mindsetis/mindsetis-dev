/**
 * The client's showcase Mindsetter profile — where "See how it looks" (Mindsetter onboarding,
 * Roles step), "See example" (`/welcome`'s Mindsetter pitch card) and "See Example" (the upgrade
 * widget on a Member's own public profile) send people, in a new tab.
 *
 * The profile doesn't exist yet (2026-09-29). Until `NEXT_PUBLIC_EXAMPLE_PROFILE_URL` is set, all three
 * controls open the "Example pages are on the way" dialog instead (`NotYetAvailable`,
 * `exampleProfile`) — owner's choice over keeping the Roles button on the platform tour popup.
 *
 * Accepts a site path (`/mindsetters/<username>`) or an absolute http(s) URL; anything else is
 * ignored rather than rendered as a live `href`. `NEXT_PUBLIC_` values are inlined at build time,
 * so setting or changing it needs a redeploy (without the build cache) — the switch moves into
 * the admin settings once the back office exists.
 */
function parseExampleProfileUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export const EXAMPLE_PROFILE_URL = parseExampleProfileUrl(
  process.env.NEXT_PUBLIC_EXAMPLE_PROFILE_URL,
);
