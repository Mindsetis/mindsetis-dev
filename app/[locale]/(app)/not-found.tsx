import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

/**
 * Locale-aware 404 — the actual body rendered for any unmatched URL inside a known locale.
 * Two ways in: (1) a page inside `/[locale]/**` calling `notFound()` directly, or (2) the
 * `app/[locale]/[...rest]/page.tsx` catch-all (added 2026-08-18) forwarding here for any URL
 * Next.js couldn't otherwise match — without that catch-all, an unmatched-but-locale-prefixed
 * URL fell through to the root `app/not-found.tsx` instead, which has no Header/Footer (it
 * lives outside `[locale]`, so no layout, no translations). `app/not-found.tsx` stays as the
 * true last-resort fallback for URLs that don't even resolve to a locale segment.
 *
 * Figma: "404" (`1112:27458`, desktop) / "404 - Mobile - 375" (`1154:16573`, mobile) — found via
 * `search_nodes` originally, RE-CONFIRMED 2026-08-18 against a live `get_selection` (this time a
 * real selection, matching `1112:27458` exactly). Big "404" numeral is its own element (Cal
 * Sans, 250px desktop / 120px mobile, no manual line breaks) — kept out of `notFound.title`
 * since digits don't need translating and don't belong inside a translatable string. The
 * numeral's fill has no named Figma style (`fills`/`fillStyle` both absent from the node, unlike
 * every other gradient text on this site) and isn't reachable through `get_styles`/
 * `export_tokens` either, so its exact stops can't be read back — chose the reusable
 * `--gradient-primary` token (`bg-[image:var(--gradient-primary)] bg-clip-text text-transparent`,
 * the same technique `LegalPage.tsx` uses) over hand-copying `WelcomeScreen.tsx`'s bespoke
 * stops, since that one is explicitly a ONE-OFF gradient for that screen's heading (per its own
 * doc comment) and this numeral has no equivalent named style tying it to either.
 *
 * LAYOUT MATH (re-measured 2026-08-18 against the live selection — the card genuinely overlaps
 * the numeral in Figma, it isn't a vertical stack with a gap):
 *   - Desktop content area (frame height 650 minus the 88px header) = 562px. Numeral sits 65px
 *     below the header (`md:pt-[65px]`); its own box is 225px tall (250px font × 0.9 line-height
 *     — `leading-[0.9]` reproduces this without a hardcoded height). The card starts 53px before
 *     the numeral's box ends (`md:-mt-[53px]` on the card) — height 253px, width 560px (`480px`
 *     content + 2×40px padding), so it visually covers the numeral's bottom edge. 72px remains
 *     below the card (`md:pb-[72px]`). 65 + 225 − 53 + 253 + 72 = 562 — accounts for the full
 *     content height exactly, so no extra `min-h` is needed on top of this padding.
 *   - Mobile content area (630 − 80px header) = 550px: 64px top (`pt-16`), numeral 108px tall
 *     (120px × 0.9), card starts 16px before the numeral ends (`-mt-4`), card 298px tall, 96px
 *     remaining below (`pb-24`). 64 + 108 − 16 + 298 + 96 = 550, same exact-accounting property.
 *   - Both numeral and card are horizontally centered on the frame in Figma (measured centers
 *     coincide with the frame's own center at every width) — `items-center` on the column plus
 *     `max-w-[560px]` (Figma's fixed desktop card width; mobile's 343px card width is just this
 *     page's own `px-4` squeezing a `w-full` card, not a separate measurement) reproduces that.
 *
 * The card (`rounded-[20px]`, `bg-card`, `border-[#2a2a2a]`) holds the title/description pair
 * and two buttons — "Go to homepage" (`outline`) and "Log in / Sign up" (`primary`). Desktop:
 * side by side, "Go to homepage" left. Mobile: the Figma mockup stacks them in the OPPOSITE
 * order (gradient button on top) — kept the same DOM order, swapped visually via `md:order-*`,
 * same "keep DOM order, swap via CSS order" precedent used on `/welcome` and the Mindsetter
 * congrats screen. "Log in / Sign up" → `/login` (the header's own single entry point for both
 * flows) — Figma has no prototype reaction on this button, so the destination is an assumption,
 * flagged here and in the handoff report.
 *
 * NOT reproduced: the mobile Figma frame draws "Log in / Sign up" as a raw gradient-filled
 * `Frame` (not an instance of the shared "Primary" button component), so it renders with a
 * gradient background even at mobile width. The `primary` Button variant is deliberately FLAT
 * on mobile everywhere else in this codebase (2026-07-17 spec decision, see `button.tsx`'s own
 * doc comment) — treated this one mobile mockup as a one-off inconsistency rather than a reason
 * to special-case the shared variant.
 */
export default async function NotFound() {
  const t = await getTranslations('notFound');

  return (
    <div className="flex flex-col items-center px-4 pt-16 pb-24 text-center md:pt-[65px] md:pb-[72px]">
      <h1 className="bg-[linear-gradient(180deg,#70deff_12.59%,#010101_85.19%)] bg-clip-text font-display text-[120px] leading-[0.9] tracking-[-0.02em] text-transparent md:text-[250px]">
        404
      </h1>

      <div className="-mt-4 flex w-full max-w-[560px] flex-col gap-8 rounded-[20px] border border-[#2a2a2a] bg-card p-[23px] md:-mt-[53px] md:p-10">
        <div className="flex flex-col gap-3 md:gap-4">
          <h2 className="font-display text-[24px] text-foreground md:text-m">{t('title')}</h2>
          <p className="text-body font-medium text-muted-foreground md:font-normal">
            {t('description')}
          </p>
        </div>

        {/* DOM order is Log in -> Go to homepage so the gradient CTA sits FIRST on mobile
            (per Figma's mobile frame); `md:order-*` swaps them visually at desktop, where
            "Go to homepage" is on the left. Height is 52px from `md` up — `size="lg"` alone
            is 56px, which is the shared button height everywhere else but not on this frame. */}
        <div className="flex flex-col gap-3 md:flex-row">
          <Button
            asChild
            variant="primary"
            size="lg"
            className="w-full md:order-2 md:h-[52px] md:flex-1"
          >
            <Link href="/login">{t('logInOrSignUp')}</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full md:order-1 md:h-[52px] md:flex-1"
          >
            <Link href="/">{t('back')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
