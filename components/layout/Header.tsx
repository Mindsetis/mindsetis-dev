import { getTranslations } from 'next-intl/server';

import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';
import { JoinIcon } from '@/components/icons/join-icon';
import { AccountMenu } from '@/components/layout/AccountMenu';
import { Button } from '@/components/ui/button';
import { NotYetAvailable } from '@/components/ui/not-yet-available';
import { Link } from '@/i18n/navigation';
import { ctaStateFromProfile } from '@/lib/auth/cta-state';
import { getCurrentUser } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';

type HeaderProps = {
  /**
   * `'full'` (default) — logo + `LocaleSwitcher` + Join CTA, used everywhere via
   * `app/[locale]/(app)/layout.tsx`. `'minimal'` — logo only, centered, no
   * `LocaleSwitcher`/Join — used by the coming-soon homepage placeholder (stage 1.11,
   * ROADMAP), which sits outside the `(app)` route group and renders its own chrome.
   */
  variant?: 'full' | 'minimal';
};

/**
 * Primary site header — Figma "Header PC" (desktop) / "header mobile" (mobile), Mindsetis
 * design file.
 *
 * Signed-out visitors get the Join CTA; signed-in ones get the avatar + account menu in its place
 * (2026-08-12, `AccountMenu` — Figma `910:11291`). This replaces the bare email + `SignOutButton`
 * pair that used to live here before the 2026-07-18 pass stripped signed-in UI entirely; sign-out
 * now lives inside the menu, so `SignOutButton` is no longer referenced from the header.
 *
 * The design's header also carries a search field, a Community/Sessions/Events nav, saved/
 * notification icons and a "Create event" CTA. None of those are built — their destinations don't
 * exist yet — so this stays brand + locale + account.
 *
 * The profile query runs only for a signed-in visitor, for the columns `AccountMenu` needs plus
 * `onboarding_step` (added for the A4 beacon CTA below, see `lib/auth/cta-state.ts`).
 * `getSessionContext()` would already return username/account_type, but not `avatar_url`, and
 * it isn't request-cached — so this is one query either way.
 */
export default async function Header({ variant = 'full' }: HeaderProps) {
  const t = await getTranslations('nav');
  const user = variant === 'full' ? await getCurrentUser() : null;

  if (variant === 'minimal') {
    return (
      <header className="sticky top-0 z-40 bg-card">
        <div className="mx-auto flex h-[70px] max-w-[1440px] items-center justify-center px-4 sm:px-6 lg:h-[88px] lg:px-[70px]">
          <Link
            href="/"
            className="font-display text-[1.5rem] leading-none font-normal text-primary lg:text-[2rem]"
          >
            {t('brand')}
          </Link>
        </div>
      </header>
    );
  }

  let profile: {
    username: string;
    account_type: 'member' | 'mindsetter';
    avatar_url: string | null;
    full_name: string | null;
    verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
    // Added for the A4 beacon CTA below — same row `AccountMenu` already needs, so this piggy-
    // backs on that existing query instead of running a second one (see `lib/auth/cta-state.ts`'s
    // doc comment, "WHY TWO EXPORTS").
    onboarding_step: number | null;
  } | null = null;

  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('profiles')
      .select('username, account_type, avatar_url, full_name, verification_status, onboarding_step')
      .eq('id', user.id)
      .maybeSingle();
    profile = data;
  }

  // `guest` is unreachable here (falls through to the `user ? null : …` branch below instead) —
  // this only ever resolves to one of the three signed-in states, all reusing the same
  // `profile` row `AccountMenu` needs.
  const ctaState = profile ? ctaStateFromProfile(true, profile) : null;

  return (
    <header className="sticky top-0 z-40 bg-card">
      <div className="mx-auto flex h-[70px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:h-[88px] lg:px-[70px]">
        <Link
          href="/"
          className="font-display text-[1.5rem] leading-none font-normal text-primary lg:text-[2rem]"
        >
          {t('brand')}
        </Link>

        <div className="flex items-center gap-3 lg:gap-8">
          <LocaleSwitcher />

          {profile ? (
            // Nested `gap-4` at `lg` (not the outer row's own `gap-8`): unlike the guest row,
            // which is Figma-verified at `gap-8`, there is no design frame for "avatar + beacon
            // CTA" yet (A4 adds this pairing new), so this pair gets its own spacing instead of
            // reusing the switcher↔avatar gap verbatim. Below `lg` it tightens further to `gap-2`
            // — see the beacon Button's own comment for why (live-measured mobile-width fix,
            // 2026-09-17).
            <div className="flex items-center gap-2 lg:gap-4">
              <AccountMenu
                username={profile.username}
                accountType={profile.account_type}
                avatarUrl={profile.avatar_url}
                displayName={profile.full_name?.trim() || profile.username}
                isVerified={profile.verification_status === 'verified'}
              />

              {/* A4 "beacon" CTA — state from `lib/auth/cta-state.ts`, mapped to (label,
                  destination) right here since the header's mapping is its own (the hero/
                  "What is Mindsetis" map the same states to different copy — see that
                  module's doc comment).
                  No `JoinIcon` on any of these: the task is explicit the icon is
                  `Apply to Join`-only. No fixed `lg:w-[199px]` either (unlike the guest Join
                  CTA below, which is a real Figma frame and stays exactly as measured) —
                  these three labels are shorter and don't need it, and forcing them into that
                  width would add unused padding for no visual reason; hug-content instead.

                  MOBILE FIT — live-measured in headless Chrome over CDP (mobile emulation, so
                  no phantom scrollbar-gutter width — matches a real phone), 2026-09-17, all
                  three signed-in states at both 375×667 and 390×844:
                    - `size="sm"`'s stock `px-6`/`text-base` clipped `Create Event` (the longest
                      label, ~132px needed) against the container — visible overflow, no way to
                      scroll to see the rest.
                    - With `px-3 text-sm` here plus the row's two gaps tightened (`gap-8`→`gap-3`
                      on the switcher↔content split above, `gap-4`→`gap-2` on avatar↔CTA), the
                      button's right edge lands EXACTLY at the container's padding edge with no
                      overflow at all (`document.documentElement.scrollWidth === clientWidth` at
                      both widths, for all three states) — e.g. `Create Event` measures 111.7px
                      wide, right edge 359px at 375 / 374px at 390 (container right 375 / 390,
                      i.e. the full 16px `px-4` clearance, not a px less); `Edit Profile` 98.5px;
                      `Upgrade` 81.9px. Avatar (43px, right edge 252.5–284px across states) never
                      touches the CTA — `gap-2`'s 8px always separates them. Text renders on one
                      line, nothing truncated (`whiteSpace: nowrap`, confirmed via computed
                      style), and the button stays 46px tall (`size="sm"`'s own height, untouched
                      — ≥44px WCAG tap-target minimum). The same `gap-8`→`gap-3` split also fixed
                      the guest Join CTA below, which was independently tight on the same row
                      (147px wide "Apply to Join" now lands at the same exact 359/374px right
                      edge — the Join button's own classes are untouched, only the shared gap).
                  `lg:text-base` restores the original 16px type at desktop, where none of this
                  applies (`lg:h-14 lg:px-5` unchanged, still Figma-exact — 1440 guest Join CTA
                  re-measured at exactly 199px wide, right edge 1355px, zero overflow). */}
              {ctaState === 'memberIncomplete' ? (
                <Button
                  asChild
                  size="sm"
                  className="rounded-[8px] px-3 text-sm lg:h-14 lg:rounded-lg lg:px-5 lg:text-base"
                >
                  <Link href="/continue">{t('editProfile')}</Link>
                </Button>
              ) : null}

              {ctaState === 'memberComplete' ? (
                <Button
                  asChild
                  size="sm"
                  className="rounded-[8px] px-3 text-sm lg:h-14 lg:rounded-lg lg:px-5 lg:text-base"
                >
                  {/* `/mindsetter-onboarding/roles` — same destination as every other "Become a
                      Mindsetter" entry point (`CabinetHeader.tsx`, `WelcomeCtas.tsx`,
                      `WhoIsMindsetterDialog.tsx`); a confirmation modal is planned in front of
                      it later (Release-1 C7), out of scope here. */}
                  <Link href="/mindsetter-onboarding/roles">{t('upgrade')}</Link>
                </Button>
              ) : null}

              {ctaState === 'mindsetter' ? (
                <NotYetAvailable feature="createEvent">
                  <Button
                    type="button"
                    disabled
                    size="sm"
                    className="rounded-[8px] px-3 text-sm lg:h-14 lg:rounded-lg lg:px-5 lg:text-base"
                  >
                    {t('createEvent')}
                  </Button>
                </NotYetAvailable>
              ) : null}
            </div>
          ) : null}

          {user ? null : (
            <>
              {/* Borderless text link beside the CTA, per Figma's desktop header. `ghost` is the
                  only variant with no fill or border of its own; the height matches the Join CTA
                  so the right-hand controls share one baseline.
                  Now shown at every width (2026-09-17): a guest on a phone previously had NO
                  visible way back into their account — this was `hidden` below `lg` and neither
                  `/join` nor `/sign-up` link to `/login`, so the only path in was typing the URL
                  by hand. Fitting it back onto the 375-wide guest row (see the Join CTA's own
                  comment below for the shared-gap math that made room) meant shrinking the type
                  to `text-sm` below `lg`; `lg:text-base` restores the original 16px at desktop,
                  where nothing else here changes. `size="sm"`'s own `h-[46px]` (unchanged, only
                  overridden back to `h-14` at `lg` as before) already clears the 44px WCAG
                  tap-target minimum, so no separate height override was needed for the tap zone
                  despite `ghost` having no visible fill to hint its bounds. */}
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="px-0 text-sm lg:h-14 lg:text-base"
              >
                <Link href="/login">{t('login')}</Link>
              </Button>

              {/* Figma: "header mobile" Join CTA (168:3071) = 46px tall, 24px horizontal
                  padding, 8px radius, hug-content width — matches size `sm` (h-[46px] px-6)
                  plus a local radius override (base Button radius is 12px). "Header PC" Join
                  CTA (387:1603) = 56px tall, 12px radius (already matches `lg`), and a FIXED
                  199px width (not hug-content, unlike every other Button usage) — set
                  explicitly at `lg` since Tailwind can't express "hug on mobile, fixed on
                  desktop" via the size prop alone.
                  Destination is `/join` (`app/[locale]/(app)/join/page.tsx`), not `/sign-up`:
                  signing up starts by submitting an email in the hero form there, which then
                  carries it into the wizard (`HeroEmailCta` → `/sign-up?email=…`), so sending
                  people straight to `/sign-up` skips the step this CTA is named after. `/join`
                  used to just be the home hero itself (`/`) before the real "Main Page" homepage
                  (`MainPageSection`) took that slot over and the old hero moved to its own route.

                  Mobile label shortened to `nav.joinShort` ("Join"/"Unirse", 2026-09-17): restoring
                  `Log in` to the row above meant the guest row went from 2 controls sharing one
                  gap to 3 sharing two, and "Apply to Join" (147px) plus a real "Log in" no longer
                  both fit — this label is the one asked to give up the width, not `Log in`
                  (that's the one guests actually need on a phone; this CTA's `/join` destination
                  is still reachable from the hero below the fold). `lg:` is untouched — `nav.join`
                  ("Apply to Join") plus `JoinIcon` still render at the exact Figma-verified 199px
                  frame; only the two spans below make the label breakpoint-conditional (CSS
                  `hidden`/`display` toggles, not a second `t()` call keyed on width — there is no
                  server-side width to key on). */}
              <Button
                asChild
                size="sm"
                className="rounded-[8px] lg:h-14 lg:w-[199px] lg:rounded-lg lg:px-5"
              >
                <Link href="/join">
                  <JoinIcon className="hidden lg:inline" />
                  <span className="lg:hidden">{t('joinShort')}</span>
                  <span className="hidden lg:inline">{t('join')}</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
