import { BadgeCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { EditPencilIcon, ViewProfileIcon } from '@/components/icons/cabinet-header-icons';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { ProfileCompleteness } from '@/lib/profile/completeness';
import { cn } from '@/lib/utils';

/**
 * Interaction states shared by "Edit" and "View public profile" (2026-08-10 design ask) — both
 * icons already render `fill="currentColor"` (`cabinet-header-icons.tsx`), so a single text-color
 * utility recolors icon + label together for every state below, no separate icon handling needed.
 *
 *   - Hover: `#fff` — the exact `--color-foreground` token, not a raw hex.
 *   - Pressed (`:active`): back to the DEFAULT `text-primary` (explicitly restated — otherwise a
 *     press that starts while already hovering would keep hover's white, since `active:` only
 *     overriding `opacity` wouldn't touch the color hover already set) + `opacity-70`.
 *   - Disabled: `#747474` (no matching semantic token — `--color-border`/`--color-input` happen
 *     to share this hex but are not text-color tokens, so this stays an arbitrary value).
 *
 * Neither link has a live "disabled" trigger in this component today (`nextUnfilled` gates
 * whether "Edit" renders AT ALL rather than rendering it inert, and "View public profile" is
 * always a real route) — this targets `aria-disabled="true"` via Tailwind's `aria-disabled:`
 * variant so the state is ready the moment either link gains one, and `pointer-events-none`
 * alongside it so hover/active can never fire while disabled (removing any doubt about which
 * state wins if a browser ever matched more than one at once).
 */
const LINK_STATE_CLASSES =
  'text-primary transition-colors hover:text-foreground active:text-primary active:opacity-70 aria-disabled:pointer-events-none aria-disabled:text-[#747474]';

/**
 * The cabinet's standing header card — Figma `600:4022` / `708:9017`, repeated above the content
 * on every cabinet screen (including each My Profile section editor), which is why it lives in
 * the `/dashboard` layout rather than in any one page.
 *
 * Three pieces of behavior worth stating, all resolved with the user on 2026-08-10:
 *   - "Edit" appears ONLY below 100% and links to the first unfilled section in card order
 *     (`completeness.nextUnfilled`, computed in `lib/profile/completeness.ts`). Optional sections
 *     count too, so a profile only hits 100% — and only loses this button — once every card,
 *     optional ones included, is filled.
 *   - "View public profile" points at whichever page is canonical for this account: a Mindsetter's
 *     `/mindsetters/{username}`, a Member's `/members/{username}`. Those routes resolve the
 *     owner-preview banner themselves (2026-08-10 "one profile page per account" pass), so this is
 *     a plain link, not a special preview mode.
 *   - "Become a Mindsetter" shows for Members only, and starts the extended wizard at its first
 *     step. A Mindsetter has nothing to become, so the slot is empty for them.
 */
export type CabinetHeaderProps = {
  accountType: 'member' | 'mindsetter';
  username: string;
  fullName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  completeness: ProfileCompleteness;
};

export async function CabinetHeader({
  accountType,
  username,
  fullName,
  lastName,
  avatarUrl,
  isVerified,
  completeness,
}: CabinetHeaderProps) {
  const t = await getTranslations('dashboard.header');

  // Falls back to the username so the card never renders a nameless avatar — `full_name` is
  // required at sign-up, but a profile row can predate that guarantee.
  const displayName = [fullName, lastName].filter(Boolean).join(' ').trim() || `@${username}`;
  const publicProfileHref =
    accountType === 'mindsetter' ? `/mindsetters/${username}` : `/members/${username}`;

  return (
    // `rounded-[20px]` is arbitrary — this project's redefined radius scale (`--radius-*` in
    // `radius.css`) tops out at `xl` (16px); 20px falls between that and the untouched stock
    // `2xl`/`3xl` (16px/24px), so no existing token lands on it. `bg-card` is the exact
    // #1a1a1a token (`colors.css`), reused rather than hardcoding the hex again.
    // Mobile (Figma `1001:8333`): 16px radius, 18/16 padding, and the row never splits — the two
    // right-hand CTAs below are hidden entirely on a phone, so there is nothing to wrap to a
    // second line. Desktop keeps its 20px radius and 24px padding.
    <div className="flex flex-col gap-4 rounded-xl bg-card px-4 py-[18px] md:flex-row md:items-center md:justify-between md:gap-6 md:rounded-[20px] md:p-6">
      <div className="flex items-center gap-3 md:gap-5">
        {/* `relative` wrapper for the online-style badge below — flush to the avatar's own
            bottom-right corner, not the row's. */}
        <div className="relative shrink-0">
          {avatarUrl ? (
            // <img> matches the existing precedent (AvatarUpload, MemberProfileView) for
            // rendering profiles.avatar_url.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="size-12 rounded-full object-cover md:size-16" />
          ) : (
            <div aria-hidden="true" className="size-12 rounded-full bg-white/10 md:size-16" />
          )}

          {/* Static decorative "online" dot (2026-08-10 design ask) — this app has no real
              presence/online-status tracking yet, so it isn't wired to any live state; it's
              rendered unconditionally, same as the Figma mock shows it. `bg-success` is the
              exact #08d6ad token; `rounded-[10px]`/`border-[2.5px]` are arbitrary (10px falls
              between the `md`/`lg` radius tokens, and no border-width token matches 2.5px). */}
          <span
            aria-hidden="true"
            className="absolute right-0 bottom-0 size-4 rounded-full border-2 border-black bg-success md:size-5 md:rounded-[10px] md:border-[2.5px]"
          />
        </div>

        {/* `flex-1` on mobile: the progress bar inside is fluid, but it can only fill space this
            column actually has — without it the column shrinks to its widest line (the name) and
            the bar collapses to ~60px. Desktop keeps the default sizing, where the bar is a fixed
            260px and growing this column would just push the right-hand CTAs around. */}
        <div className="flex min-w-0 flex-1 flex-col gap-0 md:flex-initial">
          {/* Mobile stacks name over badge (the frame draws them on separate lines); desktop keeps
              them side by side. */}
          <div className="flex flex-col items-start gap-[3px] md:flex-row md:flex-wrap md:items-center md:gap-3">
            {/* Mobile: Manrope Medium 16px, per the frame — NOT the display face, which only takes
                over at `md`. `md:text-[32px]/[42px]` (Tailwind's font-size/line-height slash
                syntax, 2026-08-10): `text-h3`'s own line-height (0.9, unitless) only pairs
                correctly with ITS OWN 48px size, so the desktop size pairs with an explicit 42px. */}
            <h1 className="truncate text-base font-medium text-foreground md:font-display md:text-[32px]/[42px] md:font-normal">
              {displayName}
            </h1>
            {isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 px-2.5 py-1 text-tiny text-emerald-400">
                <BadgeCheck className="size-4" aria-hidden="true" />
                {t('verified')}
              </span>
            )}
          </div>

          {/* `py-[2.7px]` (2026-08-10): the row's own content (the `text-tiny` percent/"Edit"
              text, its tallest child) renders at ≈19.6px — this padding tops it up to the
              requested 25px total row height. Not a round number because 25px isn't a multiple
              of the `text-tiny` line-height it's padding around; the value below is measured,
              not guessed. */}
          <div className="flex items-center gap-2.5 py-[2.7px]">
            {/* Native <progress> would bring its own hard-to-restyle UA appearance; this is a
                plain div pair with the ARIA roles that make it announce like a progress bar. */}
            <div
              role="progressbar"
              aria-valuenow={completeness.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('completenessLabel')}
              // Fluid on a phone (the frame stretches it across the card) — a fixed 260px would
              // push the percentage and "Edit" off a 375px screen.
              className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[#2a2a2a] md:w-[260px] md:flex-none"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${completeness.percent}%` }}
              />
            </div>
            <span className="text-tiny text-muted-foreground">{completeness.percent}%</span>

            {completeness.nextUnfilled && (
              <Link
                href={completeness.nextUnfilled.href}
                className={cn('inline-flex items-center gap-[5px] text-tiny', LINK_STATE_CLASSES)}
              >
                <EditPencilIcon />
                {t('edit')}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Hidden below `md`: the mobile frame's header card carries only the identity block and the
          progress row. "View public profile" moves into the account sheet there, and no mobile
          frame draws "Become a Mindsetter" at all. */}
      <div className="hidden flex-wrap items-center gap-4 md:flex">
        <Link
          href={publicProfileHref}
          className={cn(
            'inline-flex items-center gap-2 text-tiny font-bold md:text-base',
            LINK_STATE_CLASSES,
          )}
        >
          <ViewProfileIcon />
          {t('viewPublicProfile')}
        </Link>

        {accountType === 'member' && (
          <Button asChild variant="primary" size="lg">
            <Link href="/mindsetter-onboarding/roles">{t('becomeMindsetter')}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
