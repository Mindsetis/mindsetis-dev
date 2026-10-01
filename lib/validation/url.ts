/**
 * Web-address fields that people type by hand — Company Website, the social channels, role links,
 * the YouTube/Vimeo fields. Shared by the client `zodResolver` and the Server Actions, so both
 * sides normalize and judge an address identically.
 *
 * People paste a bare domain far more often than a full URL (`medfuture.ua`, `linkedin.com/in/x`),
 * and a plain `.url()` rejected that with no hint why (client report, 2026-09-28). So the scheme is
 * optional on input: a value without one gets `https://` prepended, and what reaches the database
 * is always a full absolute URL.
 *
 * Security stays where it was: only `http:`/`https:` survive. These values are rendered as live
 * `<a href>`s and, for role links, fetched server-side — `javascript:`/`data:`/`vbscript:` were a
 * stored-XSS vector (security-auditor, stage 1.6). A value that already names a scheme is left as
 * typed, so `javascript:alert(1)` keeps its scheme and fails the check below instead of being
 * "fixed" into `https://javascript:alert(1)`.
 */
import { z } from 'zod';

import { vmsg } from './messages';

/** A leading `scheme:` — `https:`, `http:`, `javascript:`, `mailto:`… — per RFC 3986's grammar. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * `medfuture.ua` → `https://medfuture.ua`; `//cdn.site.com/x` → `https://cdn.site.com/x`;
 * anything that already carries a scheme is returned unchanged (trimmed). Empty stays empty.
 *
 * A bare `host:port` (`site.com:8080`) reads as a scheme to that regex, so it is only treated as
 * one when it isn't followed by digits — otherwise it's a domain and gets the prefix too.
 */
export function normalizeWebUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (HAS_SCHEME.test(trimmed) && !/^[^:/]+:\d/.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * `true` for an absolute `http:`/`https:` URL whose host is a real-looking domain: at least one
 * dot and a letters-only top-level zone of two or more characters (`company.com`, `site.com.ua`).
 * Rejects `medfuture` (no zone), `localhost`, raw IPs and anything with whitespace.
 */
export function isWebUrl(value: string): boolean {
  if (/\s/.test(value)) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const labels = url.hostname.split('.');
    const zone = labels.at(-1) ?? '';
    if (labels.length < 2 || labels.some((label) => !label)) return false;
    // Letters-only zone, or its punycode form (`.укр` arrives from `URL` as `xn--j1amh`).
    return /^[a-z]{2,}$/i.test(zone) || /^xn--[a-z0-9-]+$/i.test(zone);
  } catch {
    return false;
  }
}

/**
 * A web address: scheme optional on input, normalized to a full `https://` URL on output.
 * `allowEmpty` lets a blank (or whitespace-only) value through as `''` for optional fields.
 * Input and output are both `string`, so `zodResolver`/`useForm` typing is unaffected.
 */
export function webUrlSchema({
  allowEmpty = false,
  message = vmsg('urlInvalid'),
}: { allowEmpty?: boolean; message?: string } = {}) {
  return z
    .string()
    .trim()
    .transform(normalizeWebUrl)
    .refine((value) => (allowEmpty && value === '') || isWebUrl(value), message);
}
