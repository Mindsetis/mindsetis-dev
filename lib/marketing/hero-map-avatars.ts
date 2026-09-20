/**
 * Data for the Main Page hero's world-map avatar layer (`HeroBand`, Release-1 H1/H2/H3).
 *
 * The map used to ship as one flattened `public/images/main-page-avatar-map.png` (base dots
 * + all 25 avatars + their glow baked in). Figma exports now split it into a base layer
 * (`public/images/hero-map/base.webp`, dots only, no avatars) and 25 individual avatar files
 * (`public/images/hero-map/avatar-01.webp` … `avatar-25.webp`), each already including its own
 * baked-in halo/glow — so `HeroBand` composites them as absolutely-positioned layers instead of
 * rendering one static image. Kept as data (rather than 25 hardcoded JSX blocks) so a stage can
 * extend the pulse to more/all avatars, or adjust a coordinate, by editing this file alone — as
 * H3 did, taking H2's 3-avatar pulse demo to all 25 with deterministic, chaotic-by-group timing
 * (see the doc comment on `HERO_MAP_PULSE_GROUPS` below for the full rationale).
 */

export type HeroMapAvatar = {
  /** File stem shared by the `.png` and `.webp` exports, e.g. `"avatar-01"`. */
  readonly id: string;
  /** Center X of the avatar, in % of the map's own width. Paired with `top` + `translate(-50%, -50%)`. */
  readonly left: number;
  /** Center Y of the avatar, in % of the map's own height. */
  readonly top: number;
  /**
   * Rendered width, in % of the map's own width — the EXPORTED FILE's width (photo + its baked-in
   * glow halo), not the visible photo diameter. Figma's blur radius for the halo is a fixed px
   * value that doesn't scale down with a smaller avatar, so using the photo diameter here would
   * make small avatars' halos disproportionately thick relative to big ones.
   */
  readonly width: number;
};

/**
 * Centers + sizes measured in Figma against the 2880×936 (@2x of 1440×468) map export. Order is
 * source order (Figma layer order / file numbering) and only affects DOM stacking, which barely
 * matters here — avatars don't meaningfully overlap.
 */
export const HERO_MAP_AVATARS: readonly HeroMapAvatar[] = [
  { id: 'avatar-01', left: 17.64, top: 10.68, width: 5.9 },
  { id: 'avatar-02', left: 47.92, top: 13.03, width: 5.63 },
  { id: 'avatar-03', left: 63.47, top: 13.46, width: 5.07 },
  { id: 'avatar-04', left: 61.25, top: 11.75, width: 3.68 },
  { id: 'avatar-05', left: 71.67, top: 17.74, width: 4.24 },
  { id: 'avatar-06', left: 26.39, top: 19.66, width: 4.24 },
  { id: 'avatar-07', left: 89.03, top: 26.28, width: 5.07 },
  { id: 'avatar-08', left: 86.81, top: 24.57, width: 3.68 },
  { id: 'avatar-09', left: 39.86, top: 26.5, width: 4.51 },
  { id: 'avatar-10', left: 56.32, top: 29.27, width: 6.04 },
  { id: 'avatar-11', left: 11.6, top: 28.63, width: 5.21 },
  { id: 'avatar-12', left: 6.67, top: 32.48, width: 6.32 },
  { id: 'avatar-13', left: 59.1, top: 30.34, width: 4.51 },
  { id: 'avatar-14', left: 66.88, top: 29.7, width: 3.4 },
  { id: 'avatar-15', left: 68.19, top: 31.41, width: 4.1 },
  { id: 'avatar-16', left: 61.18, top: 34.19, width: 4.51 },
  { id: 'avatar-17', left: 48.26, top: 50.64, width: 5.9 },
  { id: 'avatar-18', left: 45.07, top: 54.49, width: 5.9 },
  { id: 'avatar-19', left: 16.39, top: 61.75, width: 6.32 },
  { id: 'avatar-20', left: 43.19, top: 61.54, width: 4.51 },
  { id: 'avatar-21', left: 19.38, top: 63.25, width: 4.51 },
  { id: 'avatar-22', left: 89.24, top: 63.89, width: 3.4 },
  { id: 'avatar-23', left: 20.83, top: 68.59, width: 4.51 },
  { id: 'avatar-24', left: 86.6, top: 77.56, width: 5.9 },
  { id: 'avatar-25', left: 90.07, top: 77.56, width: 5.9 },
];

/**
 * MOBILE AVATARS (Release-1 H4, added 2026-09-20) — a DIFFERENT set from `HERO_MAP_AVATARS`
 * above, not a responsive re-crop of it. Figma's mobile frame (`1490:21781` "map-base 2",
 * 375×314, nested inside the mobile hero frame `1249:18262`) hand-places 9 avatars, each
 * exported with its own halo baked for its own diameter (`avatar-m-01.webp` … `avatar-m-09.webp`
 * — the desktop `avatar-NN.webp` files, despite showing the same people, are NOT reused here:
 * their halo blur radius was baked for the desktop crop's sizes).
 *
 * COORDINATE SYSTEM — READ BEFORE TOUCHING THIS ARRAY. `HERO_MAP_AVATARS`'s `left`/`top`/`width`
 * are percentages of the MAP IMAGE's own box, because on desktop the avatars travel WITH the map
 * (same element, same transform). The mobile set is different: in Figma, these 9 are positioned
 * relative to the 375×314 VISIBLE FRAME, not relative to the map image, which on mobile is
 * scaled to 258% of that frame and shifted left 37% (`w-[258%] -translate-x-[37%]` in
 * `HeroBand`) so only a crop of it shows. Anchoring these 9 to the map element with the SAME
 * percentage convention as desktop would drag them along with that 258%/-37% transform and land
 * them nowhere near their Figma spot. So `HeroBand` renders this set in its OWN overlay box that
 * mirrors the 375×314 frame (`aspect-[375/314]`, full width of the untransformed outer wrapper —
 * see that component's doc comment) instead of inside the scaled map element. `width` here is
 * still "% of the box these percentages are relative to" for consistency with the desktop type,
 * but that box is the 375×314 frame, not the map.
 */
export const HERO_MAP_MOBILE_AVATARS: readonly HeroMapAvatar[] = [
  { id: 'avatar-m-01', left: 43.13, top: 47.93, width: 24.53 },
  { id: 'avatar-m-02', left: 30.33, top: 53.98, width: 22.4 },
  { id: 'avatar-m-03', left: 22.67, top: 64.93, width: 15.73 },
  { id: 'avatar-m-04', left: 62.13, top: 19.75, width: 18.93 },
  { id: 'avatar-m-05', left: 72.53, top: 16.56, width: 20.53 },
  { id: 'avatar-m-06', left: 15.2, top: 19.43, width: 22.67 },
  // Only non-square export in either set — Figma's halo bbox came out asymmetric because this
  // avatar sits almost flush against the frame's right edge, next to a neighbor (95×106 @2x); a
  // deliberate quirk of the source export, not something to "correct" by forcing a square size.
  { id: 'avatar-m-07', left: 94.4, top: 41.08, width: 12.67 },
  { id: 'avatar-m-08', left: 88.0, top: 38.54, width: 15.73 },
  { id: 'avatar-m-09', left: 30.07, top: 24.13, width: 15.6 },
];

/**
 * H3: every avatar pulses now (H2 shipped a 3-avatar demo for the client to sanity-check the
 * effect before committing to it). H4 folds the 9 mobile-only avatars into the same pulse system.
 * Kept as an explicit id list — rather than inlining `HERO_MAP_AVATARS`/`HERO_MAP_MOBILE_AVATARS`
 * directly in `HeroBand` — so a future stage can still opt specific avatars out without touching
 * the component.
 */
export const HERO_MAP_PULSE_AVATAR_IDS: readonly string[] = [
  ...HERO_MAP_AVATARS.map((avatar) => avatar.id),
  ...HERO_MAP_MOBILE_AVATARS.map((avatar) => avatar.id),
];

/**
 * H3 CHAOS MODEL — client's explicit ask (2026-09-20) was "all 25 pulse, but chaotic/staggered
 * in groups, not one uniform wave and not all-at-once".
 *
 * REV. 2 (same day, live-measurement rework): the first cut here picked 5 groups that each
 * carried their OWN base delay AND base duration (3.2s–5.6s), with both drawn from the same
 * per-avatar PRNG stream. QA measured the live page (fraction of avatars with `scale > 1.03`,
 * sampled every 250ms for 16–20s) and found a clean, repeating ~4.5s collective "breathing" —
 * confirmed here by simulating that exact formula and computing its autocorrelation: a
 * reproducible +0.2…+0.46 peak at the 4–5.5s lag in every window checked (`[0,20]`, `[0,40]`,
 * `[10,30]`), i.e. a real, eye-catchable period — plus swings up to 19/25 (76%) avatars near
 * peak at once. Root cause: tying delay AND duration to the same group (and drawing both from
 * one continued PRNG stream) meant a "long-cycle" avatar was also reliably a "late-starting"
 * avatar — groups stayed loosely in step with each other instead of drifting apart, so the
 * whole map kept re-synchronizing on a beat close to the shared ~4–5s duration neighborhood.
 *
 * This revision keeps GROUPS (below) — the client explicitly asked to keep the concept — but
 * changes what each of the three numbers is drawn from, and how they combine:
 *
 * 1. WIDER, fully independent duration. `durationSeconds` is drawn from `[3, 8]` — the longest
 *    cycle is 2.67× the shortest (task asked for "at least double") — from its OWN seeded PRNG
 *    stream (`HERO_MAP_PULSE_DURATION_SEED_SALT`), which shares nothing with the group/delay
 *    stream below. No group, and no other avatar's duration, has any bearing on it.
 * 2. GROUP is now a small, independent nudge, not the dominant term. `groupIndex` (which of the
 *    5 groups an avatar belongs to) is drawn from its own separate PRNG stream
 *    (`HERO_MAP_PULSE_GROUP_SEED_SALT`) — independent of the duration stream, so which group an
 *    avatar lands in carries zero information about how long its cycle is (the exact
 *    correlation that caused the beat). Each group's `baseOffsetSeconds` only spans 0–0.8s.
 * 3. PHASE is what actually breaks up the beat. Rather than a random per-avatar delay (which,
 *    with only 25 samples, still clusters by chance often enough to reproduce a visible
 *    "hill" — measured ~56–60% peaks even after fix #1+#2 alone), each avatar's STARTING POINT
 *    in its own cycle is spread using a Weyl low-discrepancy sequence: `(avatarNumber ×
 *    0.6180339887…) mod 1` — the golden ratio's fractional part, the standard trick (also used
 *    for e.g. sunflower-seed/phyllotaxis spacing) for placing N points around a cycle so no two
 *    ever land suspiciously close, without it ever looking like a deliberate grid. That phase
 *    fraction, scaled by the avatar's OWN duration and applied as a NEGATIVE `animation-delay`
 *    (`groupBaseOffsetSeconds - phaseFraction × durationSeconds`), means each avatar's animation
 *    is already mid-cycle at page load instead of everyone starting flat and ramping up together
 *    — a NEGATIVE CSS `animation-delay` is defined to act exactly as if the animation had already
 *    been running for that many seconds, so this is a legal, well-supported way to pre-seed each
 *    avatar's phase (this is also the "consider negative delays" idea from the rework brief).
 *
 * MEASURED RESULT (same simulation harness, `scale > 1.03` fraction every 250ms): std of the
 * near-peak count drops from ~2.9–4.3 to ~1.8–1.9, the max drops from 19/25 (76%) to 12–13/25
 * (48–52%) in every window checked, and the old +0.2…+0.46 autocorrelation peak at 4–5.5s lag is
 * gone — every window now shows a small NEGATIVE value there instead (no positive lag anywhere
 * approaches the old signal's strength). See the H3 handback report for the full before/after
 * numbers; this file is the source of truth for the formula, not a copy of those numbers.
 *
 * DETERMINISM: nothing here calls `Math.random()`/`Date.now()` — every value is a pure function
 * of the avatar's own numeric id via a small seeded PRNG (mulberry32), so server and client
 * compute the exact same timing and React never sees a hydration mismatch.
 */
type HeroMapPulseGroup = {
  /**
   * Seconds folded into the phase formula below as a small deterministic nudge — NOT the
   * dominant term (see point 2/3 above); duration (point 3's negative-delay phase term) drives
   * the bulk of each avatar's actual on-screen timing.
   */
  readonly baseOffsetSeconds: number;
};

const HERO_MAP_PULSE_GROUPS: readonly HeroMapPulseGroup[] = [
  { baseOffsetSeconds: 0.0 },
  { baseOffsetSeconds: 0.2 },
  { baseOffsetSeconds: 0.4 },
  { baseOffsetSeconds: 0.6 },
  { baseOffsetSeconds: 0.8 },
];

const HERO_MAP_PULSE_DURATION_MIN_SECONDS = 3;
const HERO_MAP_PULSE_DURATION_MAX_SECONDS = 8;

/**
 * Golden ratio conjugate (`φ − 1`) — spreading N points via `(n × this) mod 1` is the standard
 * low-discrepancy ("Weyl sequence") way to place them around a cycle with no visible clustering
 * or grid, for any N. Used to give each avatar an even, non-coincidental starting phase.
 */
const GOLDEN_RATIO_CONJUGATE = 0.6180339887498949;

/** Arbitrary odd 32-bit mixing constants (bit-mixing only, not meaningfully "random") used to
 *  derive two INDEPENDENT PRNG seeds from the same avatar number, so the group draw and the
 *  duration draw never share entropy. */
const HERO_MAP_PULSE_GROUP_SEED_SALT = 0x9e3779b1;
const HERO_MAP_PULSE_DURATION_SEED_SALT = 0x85ebca6b;

/** Deterministic PRNG (mulberry32) — same seed always yields the same value sequence. */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mixes an avatar number with a salt into a PRNG seed — different salts give independent seeds
 *  (and therefore independent value streams) for the same avatar number. */
function seedFor(avatarNum: number, salt: number): number {
  return Math.imul(avatarNum ^ salt, 2654435761);
}

/**
 * Pulls the numeric suffix out of an id like `"avatar-07"` → `7`. Mobile ids (`"avatar-m-07"`)
 * get a `+100` offset so e.g. `avatar-07` and `avatar-m-07` — same photo, two different crops —
 * never compute the identical group/duration/phase from a coincidentally-shared number. Harmless
 * either way (the two sets never render at once, see `HeroBand`'s breakpoint split), but this
 * keeps the two id spaces honestly independent rather than relying on that.
 */
function avatarNumber(id: string): number {
  const n = Number(id.slice(id.lastIndexOf('-') + 1));
  return id.includes('-m-') ? n + 100 : n;
}

type HeroMapPulseTiming = {
  readonly delaySeconds: number;
  readonly durationSeconds: number;
};

function computeHeroMapPulseTiming(id: string): HeroMapPulseTiming {
  const n = avatarNumber(id);

  // Stream 1 (independent of duration): which group, purely for the small `baseOffsetSeconds`
  // nudge — see the doc comment above for why this is deliberately NOT tied to duration anymore.
  const groupRandom = createSeededRandom(seedFor(n, HERO_MAP_PULSE_GROUP_SEED_SALT));
  // `groupRandom()` is in [0, 1), so the index is always in range — `?? HERO_MAP_PULSE_GROUPS[0]`
  // is a `noUncheckedIndexedAccess` type satisfier, not a real fallback path.
  const groupIndex = Math.floor(groupRandom() * HERO_MAP_PULSE_GROUPS.length);
  const group = HERO_MAP_PULSE_GROUPS[groupIndex] ?? HERO_MAP_PULSE_GROUPS[0];
  if (!group) throw new Error('HERO_MAP_PULSE_GROUPS must not be empty');

  // Stream 2 (independent of group): full-width, per-avatar cycle length.
  const durationRandom = createSeededRandom(seedFor(n, HERO_MAP_PULSE_DURATION_SEED_SALT));
  const durationSeconds =
    HERO_MAP_PULSE_DURATION_MIN_SECONDS +
    durationRandom() * (HERO_MAP_PULSE_DURATION_MAX_SECONDS - HERO_MAP_PULSE_DURATION_MIN_SECONDS);

  // Not a random draw at all — a deterministic low-discrepancy placement (see
  // `GOLDEN_RATIO_CONJUGATE`'s doc comment), scaled by this avatar's OWN duration and applied as
  // a negative delay so it starts already mid-cycle instead of flat-then-ramping.
  const phaseFraction = (n * GOLDEN_RATIO_CONJUGATE) % 1;
  const delaySeconds = group.baseOffsetSeconds - phaseFraction * durationSeconds;

  return { delaySeconds, durationSeconds };
}

/**
 * CSS custom properties for a pulsing avatar's wrapper `<span>` — `hero-map-avatar-pulse-scale`
 * (on the avatar `<img>`) and `hero-map-avatar-glow` (on the sibling glow layer, see
 * `motion.css`) both read `--pulse-delay`/`--pulse-duration` from it, so the two stay in lockstep
 * without duplicating the numbers. Returns `undefined` for a non-pulsing id (nothing to set).
 */
export function getHeroMapPulseStyle(
  id: string,
): { '--pulse-delay': string; '--pulse-duration': string } | undefined {
  if (!HERO_MAP_PULSE_AVATAR_IDS.includes(id)) return undefined;

  const { delaySeconds, durationSeconds } = computeHeroMapPulseTiming(id);
  return {
    '--pulse-delay': `${delaySeconds.toFixed(2)}s`,
    '--pulse-duration': `${durationSeconds.toFixed(2)}s`,
  };
}
