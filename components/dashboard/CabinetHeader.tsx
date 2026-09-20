import { getTranslations } from 'next-intl/server';

import { GuardedLink } from '@/components/dashboard/GuardedLink';
import { EditPencilIcon, ViewProfileIcon } from '@/components/icons/cabinet-header-icons';
import { CheckCircleFillIcon } from '@/components/icons/check-circle-fill-icon';
import { Button } from '@/components/ui/button';
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
 *
 * WHERE those last two actually sit changed on 2026-09-02, after re-reading the cabinet frames:
 * the card holds ONE action per role on the right, and the completeness row's trailing cell holds
 * the other. A Member: "Become a Mindsetter" on the right, "View public profile" in that cell once
 * the profile is complete. A Mindsetter: "View public profile" on the right, in a visibly heavier
 * treatment (16px Bold + external-link glyph vs 14px Regular + pencil). The two inline comments
 * at those call sites carry the frame IDs and the reasoning; both are unreachable below `md`,
 * where the design moves this navigation into the account sheet instead.
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

  // The two roles do NOT share a width budget, so they no longer share a layout either.
  //
  // A Member's right-hand action is the 204px "Become a Mindsetter" button, and once the profile
  // is complete their completeness row also carries the long "View public profile" link — that
  // combination is what overflowed on narrow desktops. A Mindsetter's right-hand action is a
  // ~167px text link and their completeness row only ever holds the short "Edit", so the row fits
  // where the Member's does not, and the Mindsetter card is left exactly as it was.
  const isMember = accountType === 'member';

  return (
    // `rounded-[20px]` is arbitrary — this project's redefined radius scale (`--radius-*` in
    // `radius.css`) tops out at `xl` (16px); 20px falls between that and the untouched stock
    // `2xl`/`3xl` (16px/24px), so no existing token lands on it. `bg-card` is the exact
    // #1a1a1a token (`colors.css`), reused rather than hardcoding the hex again.
    // Mobile (Figma `1001:8333`): 16px radius, 18/16 padding, and the row never splits — the two
    // right-hand CTAs below are hidden entirely on a phone, so there is nothing to wrap to a
    // second line. Desktop keeps its 20px radius and 24px padding.
    //
    // A MEMBER'S ROW ONLY STARTS AT `xl` (2026-09-02); a Mindsetter's still starts at `md`, as it
    // always did. Figma draws this card at one width only — 970px, inside the 1440 frame — and
    // for a Member the row genuinely does not fit below roughly 1280. Measured budget there: the
    // left half needs ~538px (64px avatar + 20px gap + the 260px bar, percentage and link) and
    // the button on the right is 204px, ~766px with the gap. Available width inside the card is
    // 672 at 768, 516 at 1024, 772 at 1280, 932 at 1440 — and the WORST case is not the narrowest
    // window but 1024, where the 300px cabinet sidebar first appears and takes the space back.
    // Forcing the row at `md` is what pushed the button into the identity block and past the
    // card's edge. Between `md` and `xl` a Member's card keeps the stacked layout and the button
    // sits under the identity block instead; the design has no frame at those widths, so this is
    // a graceful degradation rather than a drawn state.
    <div
      className={cn(
        'flex flex-col gap-4 rounded-xl bg-card px-4 py-[18px] md:rounded-[20px] md:p-6',
        isMember
          ? 'xl:flex-row xl:items-center xl:justify-between xl:gap-6'
          : 'md:flex-row md:items-center md:justify-between md:gap-6',
      )}
    >
      <div className="flex min-w-0 items-center gap-3 md:gap-5">
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

        {/* `flex-1` while the card is stacked: the progress bar inside is fluid, but it can only
            fill space this column actually has — without it the column shrinks to its widest line
            (the name) and the bar collapses to ~60px. It hands that back once the card becomes a
            row and growing this column would push the action on the right around — which is `md`
            for a Mindsetter and `xl` for a Member, matching each role's own row breakpoint above.
            While the card is still stacked the column still needs to grow. */}
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col gap-0',
            isMember ? 'xl:flex-initial' : 'md:flex-initial',
          )}
        >
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
            {/* Figma "Status badge" (`754:11877` Member / `610:4260` Mindsetter, and their 375px
                twins `1110:16702`/`1001:8339`), re-checked against the live file 2026-09-20 after
                the owner spotted this badge differing from the design.
                - GLYPH: Figma uses `ic / check-circle` — a solid disc with the tick knocked out —
                  not `lucide-react`'s `BadgeCheck`, which is a scalloped shield. Same component
                  the public profile views already render, so this reuses the shared icon rather
                  than a third copy of the path.
                - COLOUR: `#08D6AD` on the icon, the label AND a solid 1px border, with NO fill
                  behind the pill (the client's "don't fill the pill" requirement, and what the
                  node's styles show: `strokes` set, `fills` absent). That hex IS `--color-success`,
                  so this takes the token instead of the `emerald-*` palette it used to borrow.
                - SPACING: the node's padding really is asymmetric (9px left / 13px right,
                  5px top+bottom) with a 7px icon→label gap; measured, not rounded to the nearest
                  Tailwind step. */}
            {isVerified && (
              <span className="inline-flex items-center gap-[7px] rounded-full border border-success py-[5px] pr-[13px] pl-[9px] text-tiny text-success">
                <CheckCircleFillIcon className="size-4 shrink-0" />
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
              //
              // `min-w-[120px]` is a FLOOR, and it is load-bearing (2026-09-02). `flex-1` resolves
              // to `flex-basis: 0`, so this bar starts at zero width and only grows into space
              // left over by its row-mates. On a Member at 100% that row also holds "View public
              // profile" — long enough to leave nothing over, at which point the bar rendered at
              // 0px and simply vanished. The floor guarantees it stays a visible bar no matter
              // what shares the row.
              //
              // Cap vs fixed width differs BY ROLE. A Member gets `max-w-[260px]`: 260px stays the
              // width Figma draws, but as a hard width it was the biggest single reason their row
              // overflowed at narrow desktops (an unshrinkable 260px block inside a 516px card at
              // 1024), and the bar is the right thing to lose width first — it stays readable at
              // any size, while the button and link cannot shrink without clipping their text. A
              // Mindsetter keeps the original fixed 260px: their row was never the one that
              // overflowed, so there is nothing to trade away.
              className={cn(
                'h-2 min-w-[120px] flex-1 overflow-hidden rounded-full bg-[#2a2a2a]',
                isMember ? 'md:max-w-[260px]' : 'md:w-[260px] md:flex-none',
              )}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${completeness.percent}%` }}
              />
            </div>
            <span className="text-tiny text-muted-foreground">{completeness.percent}%</span>

            {/* ONE SLOT, TWO LINKS (2026-09-02, re-read off Figma). This trailing cell holds
                "Edit" while the profile is incomplete and, for a Member, becomes "View public
                profile" once it hits 100% — the two mocks show exactly that and never contradict
                each other: the Mindsetter frame (`610:4255`) sits at 64% and draws "Edit" here,
                the Member frames (`754:11872` and the three sibling cabinet screens) sit at 100%
                and draw "View public profile" here, same cell, same 14px Regular type, same
                `ball-pen-fill` pencil — not the external-link glyph the right-hand version uses.
                So the slot follows COMPLETENESS, and the difference the customer noticed between
                the two roles' styling is real and deliberate, not a copy artifact.

                Gated to Members because a Mindsetter already has this link in the actions block
                on the right; without the gate a 100% Mindsetter would render it twice. Figma has
                no Mindsetter-at-100% frame to confirm that directly, so this is the reading that
                keeps both drawn frames exact and adds no duplicate. */}
            {completeness.nextUnfilled ? (
              // `GuardedLink`, not a plain `Link` (Release-1 C-continuation, 2026-09-19): this
              // card renders on every cabinet screen, INCLUDING the section editor it can jump
              // away from, so it's a real exit path for whatever section is currently dirty.
              <GuardedLink
                href={completeness.nextUnfilled.href}
                className={cn('inline-flex items-center gap-[5px] text-tiny', LINK_STATE_CLASSES)}
              >
                <EditPencilIcon />
                {t('edit')}
              </GuardedLink>
            ) : accountType === 'member' ? (
              <GuardedLink
                href={publicProfileHref}
                className={cn('inline-flex items-center gap-[5px] text-tiny', LINK_STATE_CLASSES)}
              >
                <EditPencilIcon />
                {t('viewPublicProfile')}
              </GuardedLink>
            ) : null}
          </div>
        </div>
      </div>

      {/* Hidden below `md`: the mobile frame's header card carries only the identity block and the
          progress row. Re-confirmed 2026-09-02 against `1110:16696` (Member) and `1001:8333`
          (Mindsetter) — neither draws either action — and against the only other place they could
          have moved to, the account sheet (`1110:17043` / `1004:8011`), which carries "View public
          profile" and still no "Become a Mindsetter" in either role.

          ONE ACTION PER ROLE, not both. Figma gives this block a different single occupant per
          role, which is the placement the customer asked about: a Member gets only "Become a
          Mindsetter" (their view-profile link lives in the completeness slot on the left, see
          above), a Mindsetter gets only "View public profile" — 16px Bold with the external-link
          glyph, i.e. a genuinely different treatment from the 14px Regular pencil version on the
          left. Rendering both side by side, as this did before, matched neither frame. */}
      <div className="hidden shrink-0 flex-wrap items-center gap-4 md:flex">
        {accountType === 'member' ? (
          // `size="default"` (h-14 px-5), not `lg` (h-14 px-8): Figma's own instance
          // (`754:11880`) is 204×52 with 20px horizontal padding — `default`'s padding and 12px
          // radius already match it exactly, `lg`'s 32px never did. `h-[52px]` trims the
          // remaining 4px, the one dimension no shared size lands on.
          <Button asChild variant="primary" size="default" className="h-[52px]">
            <GuardedLink href="/mindsetter-onboarding/roles">{t('becomeMindsetter')}</GuardedLink>
          </Button>
        ) : (
          <GuardedLink
            href={publicProfileHref}
            className={cn('inline-flex items-center gap-2 text-base font-bold', LINK_STATE_CLASSES)}
          >
            <ViewProfileIcon />
            {t('viewPublicProfile')}
          </GuardedLink>
        )}
      </div>
    </div>
  );
}
