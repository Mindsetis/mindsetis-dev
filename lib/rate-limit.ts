/**
 * Rate-limiting helper backed by Upstash Redis.
 *
 * Wired now (stage 0.5) but degrades gracefully: when `UPSTASH_REDIS_REST_URL` /
 * `UPSTASH_REDIS_REST_TOKEN` are absent (Upstash is deferred infra, see ROADMAP 0.2),
 * every call is a no-op that reports "allowed". This lets sensitive actions declare their
 * limits today; they start enforcing automatically once the env vars are set — no code
 * change, no redeploy logic. Server-only.
 */
import 'server-only';

import { createHash } from 'node:crypto';

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import { ActionError } from '@/lib/api/errors';

/** A sliding-window rule: `limit` requests per `window` (Upstash duration string). */
export interface RateLimitRule {
  limit: number;
  /** e.g. `'60 s'`, `'10 m'`, `'1 h'`. */
  window: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Epoch ms when the window resets (0 when not enforced). */
  reset: number;
}

let redisSingleton: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisSingleton !== undefined) return redisSingleton;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redisSingleton = url && token ? new Redis({ url, token }) : null;
  return redisSingleton;
}

// One Ratelimit instance per distinct rule, keyed by its parameters.
const limiters = new Map<string, Ratelimit>();

function getLimiter(redis: Redis, rule: RateLimitRule): Ratelimit {
  const cacheKey = `${rule.limit}:${rule.window}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(rule.limit, rule.window),
      prefix: 'mindsetis:rl',
      analytics: false,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

/**
 * Check a rate limit. Returns `{ success: true }` (allowed) when Upstash isn't configured.
 *
 * @param identifier stable bucket key, e.g. `'auth:sign-in:203.0.113.4'`.
 */
export async function rateLimit(identifier: string, rule: RateLimitRule): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) {
    return { success: true, limit: rule.limit, remaining: rule.limit, reset: 0 };
  }
  const { success, limit, remaining, reset } = await getLimiter(redis, rule).limit(identifier);
  return { success, limit, remaining, reset };
}

/**
 * Enforce a rate limit for a logical action, keyed by the caller's IP. Throws
 * `ActionError('rate_limited')` when the limit is exceeded. Used by `createAction`.
 */
export async function enforceRateLimit(key: string, rule: RateLimitRule): Promise<void> {
  const ip = await getRequestIp();
  await assertWithinRateLimit(`${key}:${ip}`, rule);
}

/**
 * Enforce a fully-specified rate-limit bucket (no IP appended) and throw on breach. Use for
 * per-account limits (e.g. per-email sign-in throttling) that must hold across IPs, as a
 * defense against distributed brute-force. Pair with the IP-based `enforceRateLimit`.
 */
export async function assertWithinRateLimit(
  identifier: string,
  rule: RateLimitRule,
): Promise<void> {
  const { success } = await rateLimit(identifier, rule);
  if (!success) {
    throw new ActionError('rate_limited', 'Too many attempts. Please try again in a moment.');
  }
}

/**
 * Per-account rate-limit bucket (hashed so raw emails never land in Redis keys). Use for any
 * per-email ceiling that must hold across IPs (e.g. throttling sign-in, sign-up, or
 * confirmation/reset email resends for one target address), paired with an IP-based limit via
 * `enforceRateLimit`/`createAction`'s `rateLimit` option.
 */
export function emailBucket(prefix: string, email: string): string {
  return `${prefix}:${createHash('sha256').update(email).digest('hex')}`;
}

/** Best-effort client IP from proxy headers (Vercel/Cloudflare). Falls back to a constant. */
async function getRequestIp(): Promise<string> {
  const { headers } = await import('next/headers');
  const h = await headers();
  const forwardedFor = h.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]!.trim();
  return h.get('x-real-ip') ?? h.get('cf-connecting-ip') ?? 'unknown';
}
