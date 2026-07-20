/**
 * Block-sequencing helper for the extended Mindsetter onboarding's optional blocks
 * (`docs/mindsetter-extended-onboarding.md` sections 6/7, ROADMAP stage 1.9). The
 * "Make your profile shine" picker (step 4/5, `app/[locale]/mindsetter-onboarding/shine/page.tsx`)
 * lets the caller pick any subset of these blocks; rather than persisting that selection in the
 * DB, it's handed to the first picked block screen as a query string
 * (`?blocks=<slug,slug,...>&i=<index>`), and each block screen's own "Save and continue" reads
 * this same param shape to find the next one. This file is the single source of truth both sides
 * share, so the picker and every block screen agree on the ordering/route/query-param contract
 * without duplicating it.
 *
 * "Video blog" (BUILT NOT BURN) was originally deferred as Phase 2 scope, but is un-deferred back
 * into MVP per product/Figma (migration `20260718185944_mindsetter_video_blog.sql`) — it's the
 * 8th and last block below.
 */

/**
 * Canonical order — matches the picker's own list order (onboarding doc section 6). "Reel Life"
 * sits right after "Promo video" (product fix, ahead of "Numbers") — the picker (`ShineForm.tsx`)
 * renders this same array in order, so no separate ordering needs to be kept in sync there.
 */
export const BLOCK_SLUGS = [
  'promo',
  'reel-life',
  'numbers',
  'wins',
  'my-way',
  'fckups',
  'philosophy',
  'video-blog',
] as const;

export type BlockSlug = (typeof BLOCK_SLUGS)[number];

function isBlockSlug(value: string): value is BlockSlug {
  return (BLOCK_SLUGS as readonly string[]).includes(value);
}

/**
 * Route for a single block screen. The screens themselves aren't built yet (next slice after
 * this one) — this is the contract they'll be built against, same "wire the navigation ahead of
 * the route" precedent every earlier onboarding step's submit handler already uses.
 */
export function blockRoute(slug: BlockSlug): string {
  return `/mindsetter-onboarding/blocks/${slug}`;
}

/**
 * Where the flow lands once every picked block has been filled in (onboarding doc section 8,
 * Mindsetter Congrats screen).
 */
export const CONGRATS_ROUTE = '/mindsetter-onboarding/congrats';

/**
 * "Personal session" is the LAST core step (product decision D9, ROADMAP stage 1.9 follow-up):
 * roles → superpowers → help → shine → [optional blocks] → session → congrats. So once every
 * picked block is done, the flow lands on the mandatory Personal-session step next, not congrats
 * directly — `nextBlockHref` below returns this rather than `CONGRATS_ROUTE`.
 */
export const SESSION_ROUTE = '/mindsetter-onboarding/session';

/** Builds `/mindsetter-onboarding/blocks/<slug>?blocks=<...>&i=<index>` for `blocks[index]`. */
export function buildBlockHref(blocks: readonly BlockSlug[], index: number): string {
  const slug = blocks[index];
  if (!slug) {
    throw new Error(`buildBlockHref: index ${index} is out of range for [${blocks.join(', ')}]`);
  }
  const params = new URLSearchParams({ blocks: blocks.join(','), i: String(index) });
  return `${blockRoute(slug)}?${params.toString()}`;
}

type BlocksSearchParams = {
  blocks?: string | string[];
  i?: string | string[];
};

/**
 * Reads the `?blocks=&i=` handoff a block screen receives from the picker (or from the previous
 * block screen's own "Save and continue"). Unknown/invalid slugs are dropped rather than
 * throwing — a caller who hand-edits the URL just loses that one block rather than 500ing the
 * page. `index` is clamped into `[0, blocks.length - 1]` for the same reason.
 */
export function parseBlocksParam(searchParams: BlocksSearchParams): {
  blocks: BlockSlug[];
  index: number;
} {
  const rawBlocks = Array.isArray(searchParams.blocks)
    ? searchParams.blocks[0]
    : searchParams.blocks;
  const blocks = (rawBlocks ?? '')
    .split(',')
    .map((slug) => slug.trim())
    .filter(isBlockSlug);

  const rawIndex = Array.isArray(searchParams.i) ? searchParams.i[0] : searchParams.i;
  const parsedIndex = Number(rawIndex);
  const index =
    Number.isInteger(parsedIndex) && blocks.length > 0
      ? Math.min(Math.max(parsedIndex, 0), blocks.length - 1)
      : 0;

  return { blocks, index };
}

/**
 * The href a block screen's "Save and continue" navigates to: the next picked block, or the
 * (now-last) Personal-session step once `index` was the last picked block (decision D9 — see
 * `SESSION_ROUTE`'s doc comment).
 */
export function nextBlockHref(blocks: readonly BlockSlug[], index: number): string {
  const nextIndex = index + 1;
  if (nextIndex >= blocks.length) return SESSION_ROUTE;
  return buildBlockHref(blocks, nextIndex);
}
