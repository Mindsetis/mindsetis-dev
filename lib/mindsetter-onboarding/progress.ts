import { BLOCK_SLUGS, type BlockSlug, parseBlocksParam } from '@/lib/mindsetter-onboarding/blocks';

/** Core wizard screens in the order they are walked: roles, superpowers, help, shine. */
const CORE_STEPS = ['roles', 'superpowers', 'help', 'shine'] as const;

const ONBOARDING_PREFIX = '/mindsetter-onboarding/';

export type MindsetterWizardLocation =
  { kind: 'step'; current: number; total: number } | { kind: 'congrats' };

type SearchParamsLike = { get(name: string): string | null };

/**
 * Where the visitor is inside the Mindsetter wizard, derived from the URL alone (so the header can
 * render it on the server pass, no flicker):
 *
 * - core screens 1-4 (roles, superpowers, help, shine): `N = 4`, because the optional-block picks
 *   are not persisted anywhere before they ride the `?blocks=&i=` query string
 *   (`lib/mindsetter-onboarding/blocks.ts`);
 * - an optional block page: `current = 4 + (i + 1)`, `N = 4 + blocks.length`, from that same query
 *   string. Without a usable `blocks` list (hand-typed URL, bookmark, refresh with the query
 *   stripped) the page counts as the only picked block: "Step 5 of 5";
 * - congrats: its own kind, the caller decides what to show;
 * - anything else (the wizard's entry route, other pages): `null`.
 *
 * `pathname` must be locale-free (next-intl's `usePathname`).
 */
export function resolveMindsetterWizardLocation(
  pathname: string,
  searchParams: SearchParamsLike,
): MindsetterWizardLocation | null {
  if (!pathname.startsWith(ONBOARDING_PREFIX)) return null;
  const rest = pathname.slice(ONBOARDING_PREFIX.length).replace(/\/+$/, '');

  if (rest === 'congrats') return { kind: 'congrats' };

  const coreIndex = (CORE_STEPS as readonly string[]).indexOf(rest);
  if (coreIndex !== -1) {
    return { kind: 'step', current: coreIndex + 1, total: CORE_STEPS.length };
  }

  if (rest.startsWith('blocks/')) {
    const slug = rest.slice('blocks/'.length);
    if (!(BLOCK_SLUGS as readonly string[]).includes(slug)) return null;

    const parsed = parseBlocksParam({
      blocks: searchParams.get('blocks') ?? undefined,
      i: searchParams.get('i') ?? undefined,
    });
    const hasSelection = parsed.blocks.length > 0 && parsed.blocks[parsed.index] === slug;
    const blocks: readonly BlockSlug[] = hasSelection ? parsed.blocks : [slug as BlockSlug];
    const index = hasSelection ? parsed.index : 0;

    return {
      kind: 'step',
      current: CORE_STEPS.length + index + 1,
      total: CORE_STEPS.length + blocks.length,
    };
  }

  return null;
}
