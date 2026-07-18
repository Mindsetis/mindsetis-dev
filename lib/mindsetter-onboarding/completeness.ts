/**
 * Profile-completeness calc for the "Make your profile shine" picker (step 5/5,
 * `docs/mindsetter-extended-onboarding.md` section 6 / decision E.5). The Figma mock showed a
 * static, undefined "42% · Basic" with no %→tier legend — this is the real MVP rule instead,
 * kept in one small pure function so it's easy to tweak once product defines the real tiers.
 *
 * Counts 4 "core" sections (roles, superpowers, help_with, a configured Personal session — all
 * mandatory earlier steps in this same wizard, so they're only ever unfilled for a caller who
 * hasn't reached this step honestly) plus the 7 optional blocks from the picker (section 6) — 11
 * sections total — and reports what fraction the caller has actually filled in.
 */
import type { Json } from '@/lib/supabase/types.gen';

export type CompletenessTier = 'basic' | 'growing' | 'pro';

export type ProfileCompleteness = {
  percent: number;
  tier: CompletenessTier;
};

/** `mindsetter_profiles` columns this calc reads, as camelCase (mirrors the snake_case DB
 * columns 1:1 — see `Row` shape in `lib/supabase/types.gen.ts`). */
export type MindsetterProfileSnapshot = {
  roles: Json | null;
  superpowers: Json | null;
  helpWith: Json | null;
  promoVideo: Json | null;
  numbers: Json | null;
  reelLife: Json | null;
  wins: Json | null;
  myWay: Json | null;
  fckups: Json | null;
  philosophy: string | null;
};

export type SessionSettingsSnapshot = {
  /** Whether a `session_settings` row exists at all — the Personal-session step (step 4/5) is
   * mandatory and always runs before this one, so in practice this is only ever `false` for a
   * caller who reached this route without going through the wizard. */
  configured: boolean;
};

function hasEntries(value: Json | null): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasText(value: string | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/** `promo_video` is stored as `{ youtube, vimeo }` (jsonb object, not an array) — "filled" means
 * at least one of those URL fields has a non-empty value. */
function hasAnyStringValue(value: Json | null): boolean {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).some((entry) => typeof entry === 'string' && entry.trim().length > 0);
}

const CORE_SECTION_COUNT = 4;
const OPTIONAL_BLOCK_COUNT = 7;
const TOTAL_SECTIONS = CORE_SECTION_COUNT + OPTIONAL_BLOCK_COUNT;

// TODO confirm tiers — MVP guess (no product-defined %→tier legend exists yet, doc E.5).
const GROWING_THRESHOLD_PERCENT = 50;
const PRO_THRESHOLD_PERCENT = 80;

function tierForPercent(percent: number): CompletenessTier {
  if (percent >= PRO_THRESHOLD_PERCENT) return 'pro';
  if (percent >= GROWING_THRESHOLD_PERCENT) return 'growing';
  return 'basic';
}

export function computeProfileCompleteness(
  profile: MindsetterProfileSnapshot,
  session: SessionSettingsSnapshot,
): ProfileCompleteness {
  const filledCount = [
    hasEntries(profile.roles),
    hasEntries(profile.superpowers),
    hasEntries(profile.helpWith),
    session.configured,
    hasAnyStringValue(profile.promoVideo),
    hasEntries(profile.numbers),
    hasEntries(profile.reelLife),
    hasEntries(profile.wins),
    hasEntries(profile.myWay),
    hasEntries(profile.fckups),
    hasText(profile.philosophy),
  ].filter(Boolean).length;

  const percent = Math.round((filledCount / TOTAL_SECTIONS) * 100);
  return { percent, tier: tierForPercent(percent) };
}
