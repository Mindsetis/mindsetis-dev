/**
 * Server-only Open Graph link-preview scraper (ROADMAP stage 1.9, "Your roles" step —
 * see the onboarding doc's "Link — optional input ... once filled shows a preview card
 * (favicon/video-icon + og-title)"). Fetches a caller-supplied URL, parses its `<head>` for
 * OG/Twitter meta tags, and returns a small preview the Server Action
 * (`fetchRoleLinkPreview`, `app/[locale]/mindsetter-onboarding/actions.ts`) hands back to the
 * client. The `server-only` import below makes accidentally bundling this into client code a
 * build-time error — never import this from a client component.
 *
 * SSRF is the whole reason this file is careful rather than a two-line `fetch` + regex: a
 * signed-in caller controls the URL, and the server would otherwise happily fetch (and leak the
 * response of) internal/cloud-metadata endpoints on their behalf. Every request this module makes
 * — including each manually-followed redirect hop — re-runs the full protocol/hostname/DNS
 * validation in {@link resolveSafeAddress} before it's allowed to fetch, and PINS the actual TCP
 * connection to the exact address that validation just resolved (see `fetchHtml`'s pinned
 * `undici` dispatcher) so a second, independent DNS resolution inside `fetch` can't be answered
 * differently ("DNS rebinding" TOCTOU).
 *
 * Deliberately regex/string based (no HTML parser dependency, per this stage's build decision) —
 * we only need a handful of `<meta>`/`<link>`/`<title>` tags out of the `<head>`, not a full DOM.
 */
import 'server-only';

import { lookup } from 'node:dns/promises';
import net from 'node:net';

import { Agent } from 'undici';

export type LinkPreviewMediaType = 'video' | 'article' | 'link';

export interface LinkPreview {
  ogTitle?: string;
  ogImage?: string;
  mediaType: LinkPreviewMediaType;
  siteName?: string;
  favicon?: string;
}

const FETCH_TIMEOUT_MS = 5_000;
const MAX_REDIRECT_HOPS = 3;
/** ~750KB — comfortably covers any real page's `<head>` while staying well under the 512KB–1MB
 * ceiling asked for; reading stops the moment `</head>` is seen anyway (see `readBodyCapped`). */
const MAX_BODY_BYTES = 750 * 1024;
const MAX_TITLE_LENGTH = 200;
const MAX_SITE_NAME_LENGTH = 200;

const USER_AGENT =
  'Mozilla/5.0 (compatible; MindsetisLinkPreview/1.0; +https://mindsetis.community)';

/** Known video-hosting domains (product decision, this stage's build prompt) — checked against
 * the FINAL (post-redirect) URL's hostname, in addition to `og:type` containing "video". */
const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com', 'tiktok.com', 'vctr.media'];

// ---------------------------------------------------------------------------------------------
// SSRF guard
// ---------------------------------------------------------------------------------------------

/** Strips the `[...]` brackets the WHATWG `URL` parser puts around an IPv6 literal `hostname`. */
function stripIpv6Brackets(hostname: string): string {
  return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    // Malformed address — fail closed (treat as unsafe) rather than let it slip through.
    return true;
  }
  const [a, b] = parts as [number, number, number, number];
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local, incl. cloud metadata 169.254.169.254)
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (carrier-grade NAT)
  return false;
}

/** Converts a dotted-decimal IPv4 string into its two 16-bit hextet values (high, low), or
 * `null` if malformed. Used to fold a textual embedded-IPv4 tail (`::ffff:1.2.3.4`) into plain
 * hex hextets before {@link expandIpv6Hextets} runs its normal `::`-expansion pass. */
function ipv4ToHextets(ipv4: string): [number, number] | null {
  const parts = ipv4.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return null;
  }
  const [a, b, c, d] = parts as [number, number, number, number];
  return [(a << 8) | b, (c << 8) | d];
}

/** Reverse of {@link ipv4ToHextets} — folds the low 32 bits (two hextets) of an expanded IPv6
 * address back into a dotted-decimal IPv4 string, so `isPrivateIpv4` can classify it. */
function hextetsToIpv4(high: number, low: number): string {
  return [(high >> 8) & 0xff, high & 0xff, (low >> 8) & 0xff, low & 0xff].join('.');
}

/**
 * Fully expands an IPv6 address (brackets already stripped, lowercased) into its 8 numeric
 * 16-bit hextets, or `null` if it can't be parsed as valid IPv6 — callers must fail CLOSED
 * (treat `null` as private/unsafe) rather than let an unparseable value slip through.
 *
 * Handles every textual form this module can see:
 * - Plain hex shorthand with a single `::` gap (e.g. `fe80::1`, `2606:4700:4700::1111`) — this is
 *   what `URL.hostname` actually produces even for IPv4-mapped addresses (Node/WHATWG normalizes
 *   `[::ffff:169.254.169.254]` to `[::ffff:a9fe:a9fe]` — pure hex, NOT dotted-decimal — which is
 *   exactly why the previous `/^::ffff:(\d+\.\d+\.\d+\.\d+)$/` regex never matched and this
 *   function classifies numerically instead of by string pattern).
 * - A trailing embedded IPv4 dotted-quad in TEXTUAL form (e.g. `::ffff:1.2.3.4`, which can still
 *   arrive here from other callers/inputs even though `URL.hostname` itself won't produce it) —
 *   folded into two hex hextets before the normal expansion pass runs.
 */
function expandIpv6Hextets(ip: string): number[] | null {
  let normalized = ip;

  const ipv4TailMatch = ip.match(/(^|:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (ipv4TailMatch) {
    const tail = ipv4TailMatch[2]!;
    const hextets = ipv4ToHextets(tail);
    if (!hextets) return null;
    const prefix = ip.slice(0, ip.length - tail.length);
    normalized = `${prefix}${hextets[0].toString(16)}:${hextets[1].toString(16)}`;
  }

  // More than one `::` (or a stray `:::`) is never valid shorthand — malformed.
  if (normalized.includes(':::') || (normalized.match(/::/g) ?? []).length > 1) return null;

  let groups: string[];
  if (normalized.includes('::')) {
    const [left, right] = normalized.split('::') as [string, string];
    const head = left ? left.split(':') : [];
    const tail = right ? right.split(':') : [];
    const missing = 8 - (head.length + tail.length);
    if (missing < 0) return null; // too many groups even accounting for the `::` gap.
    groups = [...head, ...(Array(missing).fill('0') as string[]), ...tail];
  } else {
    groups = normalized.split(':');
  }
  if (groups.length !== 8) return null;

  const values: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
    values.push(parseInt(group, 16));
  }
  return values;
}

/**
 * Classifies an IPv6 address NUMERICALLY (after fully expanding it to 8 hextets) rather than by
 * matching against its textual form — the bug this replaces matched only the literal
 * `::ffff:a.b.c.d` dotted-decimal spelling, which `URL.hostname` never actually produces for a
 * bracketed IPv6 literal (it normalizes to pure-hex hextets, e.g. `::ffff:a9fe:a9fe`), so a
 * bracketed `[::ffff:169.254.169.254]` sailed straight through as "not recognized, therefore
 * public". Classifying the expanded numeric groups instead is robust to every textual spelling.
 */
function isPrivateIpv6(rawIp: string): boolean {
  const ip = stripIpv6Brackets(rawIp).toLowerCase();
  const groups = expandIpv6Hextets(ip);
  if (!groups) return true; // unparseable — fail CLOSED (reject), never fail open.
  const g = groups as [number, number, number, number, number, number, number, number];

  // Unspecified `::` — all groups zero.
  if (g.every((value) => value === 0)) return true;

  // Loopback `::1` — all groups zero except the last, which is exactly 1.
  if (g.slice(0, 7).every((value) => value === 0) && g[7] === 1) return true;

  // IPv4-mapped `::ffff:a.b.c.d` — groups[0..4] zero, groups[5] === 0xffff. Extract the low 32
  // bits into a dotted-decimal IPv4 string and defer to `isPrivateIpv4` — this is what catches
  // `::ffff:169.254.169.254` / `::ffff:127.0.0.1` / `::ffff:10.x.x.x` etc. regardless of whether
  // the original text was hex-hextet or dotted-quad form.
  if (g.slice(0, 5).every((value) => value === 0) && g[5] === 0xffff) {
    return isPrivateIpv4(hextetsToIpv4(g[6]!, g[7]!));
  }

  // IPv4-compatible / deprecated `::a.b.c.d` — groups[0..5] all zero, low 32 bits non-trivial
  // (already excluded loopback/unspecified above). Defense in depth: also map to IPv4 and check.
  if (g.slice(0, 6).every((value) => value === 0) && (g[6] !== 0 || g[7] !== 0)) {
    return isPrivateIpv4(hextetsToIpv4(g[6]!, g[7]!));
  }

  // NAT64 well-known prefix `64:ff9b::/96` (RFC 6052) embeds the target IPv4 in the low 32 bits.
  // Only exploitable where an actual NAT64 gateway sits on the egress path, but both these
  // embedded-IPv4-in-IPv6 forms are documented SSRF-bypass techniques, so fold them into the same
  // `isPrivateIpv4` check the mapped/compatible branches use rather than assuming the network away.
  if (g[0] === 0x0064 && g[1] === 0xff9b && g.slice(2, 6).every((value) => value === 0)) {
    return isPrivateIpv4(hextetsToIpv4(g[6]!, g[7]!));
  }

  // 6to4 `2002::/16` (RFC 3056) embeds the encapsulated IPv4 in groups[1..2].
  if (g[0] === 0x2002) {
    return isPrivateIpv4(hextetsToIpv4(g[1]!, g[2]!));
  }

  // `fc00::/7` (unique-local).
  if ((g[0]! & 0xfe00) === 0xfc00) return true;

  // `fe80::/10` (link-local).
  if ((g[0]! & 0xffc0) === 0xfe80) return true;

  return false;
}

/** Covers every literal-IP or DNS-resolved address this module ever checks — IPv4 + IPv6. */
function isPrivateIp(ip: string): boolean {
  const version = net.isIP(stripIpv6Brackets(ip));
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(stripIpv6Brackets(ip));
  return true; // not a recognizable IP at all — fail closed.
}

/** IPv4 or IPv6 address family, as returned by `dns.lookup`/`net.isIP` — passed straight through
 * to undici's pinned `Agent` so the connection dials the exact family we validated. */
type IpFamily = 4 | 6;

/** The address (+ family) a URL's hostname was validated to at a given moment — returned by
 * {@link resolveSafeAddress} so the caller can PIN the actual TCP connection to it (see
 * `fetchHtml`), instead of letting `fetch` perform an independent second DNS resolution that a
 * DNS-rebinding attacker could answer differently (TOCTOU). */
interface PinnedAddress {
  address: string;
  family: IpFamily;
}

/**
 * Full validation for one URL, re-run before EVERY fetch (initial request and each redirect
 * hop): protocol allow-list, hostname deny-list, and (for domain names) a live DNS resolution
 * whose every returned address is checked too — defeats "DNS rebinding"/a public hostname that
 * simply resolves to an internal address. Returns the validated address to PIN the real
 * connection to (see `fetchHtml`'s pinned `undici` dispatcher), or `null` if unsafe.
 */
async function resolveSafeAddress(url: URL): Promise<PinnedAddress | null> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const hostname = stripIpv6Brackets(url.hostname).toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return null;
  if (hostname === '169.254.169.254') return null; // explicit cloud-metadata call-out (already
  // covered by the 169.254.0.0/16 range below, kept for clarity per the build spec).

  const ipVersion = net.isIP(hostname);
  if (ipVersion) {
    if (isPrivateIp(hostname)) return null;
    return { address: hostname, family: ipVersion as IpFamily };
  }

  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    return null;
  }
  if (addresses.length === 0) return null;
  if (addresses.some((entry) => isPrivateIp(entry.address))) return null;

  // Pin to the first validated address — `dns.lookup`'s own default ordering, and the same
  // address a real connection attempt would try first in the common case.
  const first = addresses[0]!;
  return { address: first.address, family: first.family === 6 ? 6 : 4 };
}

// ---------------------------------------------------------------------------------------------
// Fetch (manual redirects, timeout, size cap)
// ---------------------------------------------------------------------------------------------

/**
 * Reads the response body up to `maxBytes`, stopping early once `</head>` has been seen — we
 * only ever need the `<head>` region, never the full page. Returns `null` when nothing was read.
 *
 * `signal` is the SAME `AbortController.signal` the enclosing `fetch()` was made with (see
 * `fetchHtml`) — since `response.body` is a stream tied to that same request, aborting the
 * controller after headers have already arrived (a stalled/slow-loris body) rejects the
 * in-flight `reader.read()` with an `AbortError` (verified against a Node HTTP server that sends
 * headers, writes a few bytes, then never calls `res.end()` — the pending `read()` rejects the
 * moment the shared controller aborts). The explicit `signal.aborted` check below is defense in
 * depth on top of that, in case some future runtime/proxy in the chain doesn't propagate the
 * abort onto an already-open stream the way undici's fetch does.
 */
async function readBodyCapped(
  response: Response,
  maxBytes: number,
  signal: AbortSignal,
): Promise<string | null> {
  const body = response.body;
  if (!body) {
    const text = await response.text();
    return text.length > 0 ? text.slice(0, maxBytes) : null;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let html = '';
  try {
    while (received < maxBytes) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
  } finally {
    // Best-effort — stop the underlying connection from streaming the rest of a large page we
    // no longer want; failures here are irrelevant to the caller.
    reader.cancel().catch(() => undefined);
  }
  return html.length > 0 ? html : null;
}

/** Node's global `fetch` is undici-backed in the Node.js server runtime (this whole module is
 * `server-only` and this Server Action's caller never runs on Edge), which accepts undici's own
 * `dispatcher` option — not part of the standard DOM `RequestInit` type, hence this narrow local
 * extension instead of an `any` cast. Confirmed working end-to-end (both plain HTTP and HTTPS,
 * including that TLS/cert validation still passes when the dispatcher pins the socket to an IP
 * that differs from the hostname used for SNI) — see Fix 4 in `fetchHtml` below. This does NOT
 * work on the Edge runtime; irrelevant here since this file can only ever run on Node. */
interface DispatcherRequestInit extends RequestInit {
  dispatcher?: Agent;
}

/**
 * Builds a per-hop `undici` `Agent` whose `connect.lookup` unconditionally returns the single
 * address {@link resolveSafeAddress} already validated for this hop — i.e. PINS the real TCP
 * connection to that exact address instead of letting `fetch` perform its own, independent DNS
 * resolution afterward.
 *
 * SECURITY (Fix 4, DNS-rebinding TOCTOU): `resolveSafeAddress` resolves + validates the hostname
 * exactly once. Without pinning, `fetch()` would re-resolve the SAME hostname a moment later —
 * an attacker who controls their domain's authoritative DNS (or its TTL) can answer the
 * validation lookup with a public IP and the real connection's lookup with a private/cloud-
 * metadata IP a few milliseconds later ("DNS rebinding"). Pinning closes that window: whatever
 * address passed `isPrivateIp` is the ONLY address this hop's socket can ever connect to. The
 * hostname itself is untouched for everything else — undici still uses the original URL's
 * hostname for the `Host` header and the TLS `servername` (SNI), so HTTPS certificate validation
 * is unaffected (verified against a real public HTTPS host: pinning the dispatcher to that host's
 * own resolved IP still returns a valid response, i.e. cert validation passed).
 */
function createPinnedDispatcher(pinned: PinnedAddress): Agent {
  return new Agent({
    connect: {
      lookup: (_hostname, _options, callback) => {
        callback(null, [{ address: pinned.address, family: pinned.family }]);
      },
    },
  });
}

/**
 * Fetches `currentUrl` once every hop is pre-validated AND PINNED (Fix 4) by
 * {@link resolveSafeAddress}, manually following up to `MAX_REDIRECT_HOPS` redirects (never
 * letting `fetch` auto-follow to an unvalidated/unpinned host — each hop re-runs both the
 * validation and the pinning). Returns the final HTML body (capped) + the final, post-redirect
 * URL, or `null` on any failure.
 *
 * SECURITY (Fix 2, slow-loris body): exactly ONE `AbortController`/timeout covers the WHOLE hop
 * — the `fetch()` call AND the `readBodyCapped` body-stream read below both run under the same
 * `try` using the same `controller.signal`, and `clearTimeout` only fires in `finally`, i.e.
 * after the body read has returned (or thrown). A server that sends headers promptly then
 * stalls/trickles the body can no longer hang past `FETCH_TIMEOUT_MS` — confirmed against a real
 * Node HTTP server that writes a partial body and never calls `res.end()`: aborting the shared
 * controller after headers already arrived rejects the pending `reader.read()` almost
 * immediately with an `AbortError`.
 */
async function fetchHtml(startUrl: URL): Promise<{ html: string; finalUrl: URL } | null> {
  let currentUrl = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    const pinned = await resolveSafeAddress(currentUrl);
    if (!pinned) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const dispatcher = createPinnedDispatcher(pinned);

    // Built as a separate, explicitly-typed variable (rather than an inline object literal) so
    // TS's excess-property check doesn't reject the undici-only `dispatcher` field against the
    // DOM `RequestInit` type `fetch`'s overloads expect.
    const requestInit: DispatcherRequestInit = {
      signal: controller.signal,
      redirect: 'manual',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      dispatcher,
    };

    try {
      const response = await fetch(currentUrl, requestInit);

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location || hop === MAX_REDIRECT_HOPS) return null;
        try {
          currentUrl = new URL(location, currentUrl);
        } catch {
          return null;
        }
        continue; // re-validate (and re-pin) the new URL at the top of the loop.
      }

      if (!response.ok) return null;

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType && !contentType.toLowerCase().includes('text/html')) return null;

      const html = await readBodyCapped(response, MAX_BODY_BYTES, controller.signal);
      if (!html) return null;
      // Missing content-type header: only proceed if the body actually looks like HTML.
      if (!contentType && !/<html[\s>]|<head[\s>]/i.test(html)) return null;

      return { html, finalUrl: currentUrl };
    } catch {
      return null;
    } finally {
      // Only cleared here — AFTER the body read above has settled (returned or thrown) — never
      // right after `fetch()` resolves, which is the bug Fix 2 closes.
      clearTimeout(timeoutId);
      // Release this hop's pinned `Agent` deterministically (each hop builds a fresh one), instead
      // of leaving idle keep-alive sockets/timers to accumulate under sustained load. Fire-and-
      // forget — the response body is already fully read (or the hop failed) by the time we get here.
      void dispatcher.destroy().catch(() => undefined);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------------------------
// Parsing (targeted regex — no HTML parser dependency)
// ---------------------------------------------------------------------------------------------

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Finds a `<meta property="key" content="...">` (or `name="key"`) tag and returns its
 * `content` value, regardless of which order the attributes appear in. */
function extractMeta(head: string, key: string): string | undefined {
  const tagPattern = new RegExp(
    `<meta\\b[^>]*(?:property|name)\\s*=\\s*["']${escapeRegExp(key)}["'][^>]*>`,
    'i',
  );
  const tagMatch = head.match(tagPattern);
  if (!tagMatch) return undefined;
  const contentMatch = tagMatch[0].match(/content\s*=\s*["']([^"']*)["']/i);
  return contentMatch?.[1];
}

function extractTitleTag(head: string): string | undefined {
  const match = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1];
}

/** Best-effort favicon lookup: the first `<link rel="icon"|"shortcut icon" href="...">`. */
function extractFavicon(head: string): string | undefined {
  const linkPattern = /<link\b[^>]*rel\s*=\s*["']([^"']*)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkPattern.exec(head))) {
    const relTokens = match[1]!.toLowerCase().split(/\s+/);
    if (relTokens.includes('icon')) {
      const hrefMatch = match[0].match(/href\s*=\s*["']([^"']*)["']/i);
      if (hrefMatch?.[1]) return hrefMatch[1];
    }
  }
  return undefined;
}

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

const HTML_ENTITY_PATTERN = /&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/g;

/** Decodes the handful of named HTML entities this scraper cares about, in TWO passes — some
 * providers (e.g. Vimeo) double-encode (`&amp;amp;`), which a single pass leaves as a literal
 * `&amp;` in the output. A second pass is a no-op (idempotent) on already-fully-decoded text. */
function decodeHtmlEntities(text: string): string {
  const once = text.replace(HTML_ENTITY_PATTERN, (entity) => HTML_ENTITIES[entity]!);
  return once.replace(HTML_ENTITY_PATTERN, (entity) => HTML_ENTITIES[entity]!);
}

function clamp(text: string, maxLength: number): string {
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

/** Resolves a possibly-relative meta/link URL against the final (post-redirect) page URL. */
function absolutize(value: string, base: URL): string | undefined {
  try {
    return new URL(value, base).toString();
  } catch {
    return undefined;
  }
}

/**
 * Same as {@link absolutize}, but DROPS the result (treats it as absent) unless the resolved
 * absolute URL's scheme is `http:`/`https:` — used for `ogImage`/`favicon` specifically (Fix 3,
 * security audit), since both are later stored and hotlinked (`<img src>`/favicon `<link>`) by a
 * caller that never re-validates them; without this, a scraped page's `og:image`/favicon meta
 * could point at `javascript:`, `data:`, `file:`, `vbscript:`, etc. `ogTitle`/`siteName` aren't
 * URLs at all, so they're untouched by this restriction.
 */
function absolutizeHttpUrl(value: string, base: URL): string | undefined {
  const resolved = absolutize(value, base);
  if (!resolved) return undefined;
  try {
    const { protocol } = new URL(resolved);
    return protocol === 'http:' || protocol === 'https:' ? resolved : undefined;
  } catch {
    return undefined;
  }
}

function deriveMediaType(ogType: string | undefined, hostname: string): LinkPreviewMediaType {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  const isVideoHost = VIDEO_HOSTS.some(
    (videoHost) => host === videoHost || host.endsWith(`.${videoHost}`),
  );
  if (isVideoHost || ogType?.toLowerCase().includes('video')) return 'video';
  if (ogType?.toLowerCase().includes('article')) return 'article';
  return 'link';
}

function parseHead(html: string, finalUrl: URL): LinkPreview | null {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const head = headMatch ? headMatch[1]! : html;

  const rawTitle =
    extractMeta(head, 'og:title') ?? extractMeta(head, 'twitter:title') ?? extractTitleTag(head);
  const rawImage = extractMeta(head, 'og:image') ?? extractMeta(head, 'twitter:image');
  const rawSiteName = extractMeta(head, 'og:site_name');
  const rawType = extractMeta(head, 'og:type');
  const rawFavicon = extractFavicon(head);

  const ogTitle = rawTitle
    ? clamp(decodeHtmlEntities(rawTitle.trim()), MAX_TITLE_LENGTH)
    : undefined;
  const ogImage = rawImage ? absolutizeHttpUrl(rawImage, finalUrl) : undefined;
  const siteName = rawSiteName
    ? clamp(decodeHtmlEntities(rawSiteName.trim()), MAX_SITE_NAME_LENGTH)
    : undefined;
  const favicon = rawFavicon ? absolutizeHttpUrl(rawFavicon, finalUrl) : undefined;
  const mediaType = deriveMediaType(rawType, finalUrl.hostname);

  if (!ogTitle && !ogImage && !siteName) return null; // nothing worth showing a caller.

  return { ogTitle, ogImage, mediaType, siteName, favicon };
}

// ---------------------------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------------------------

/**
 * Fetches `rawUrl` and returns its Open Graph preview, or `null` on ANY failure (invalid/unsafe
 * URL, timeout, non-2xx, non-HTML, oversized body, or no extractable data) — this function never
 * throws, so a caller can always treat a `null` result as "just don't show a preview card".
 */
export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview | null> {
  let startUrl: URL;
  try {
    startUrl = new URL(rawUrl);
  } catch {
    return null;
  }

  try {
    const fetched = await fetchHtml(startUrl);
    if (!fetched) return null;
    return parseHead(fetched.html, fetched.finalUrl);
  } catch {
    return null;
  }
}
