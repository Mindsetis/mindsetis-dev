import { getTranslations } from 'next-intl/server';

import { JoinIcon } from '@/components/icons/join-icon';
import { QuestionFillIcon } from '@/components/icons/main-page-icons';
import { UpgradeToMindsetterTrigger } from '@/components/mindsetter/UpgradeToMindsetterTrigger';
import { Button } from '@/components/ui/button';
import { NotYetAvailable } from '@/components/ui/not-yet-available';
import { Link } from '@/i18n/navigation';
import { resolveCtaState } from '@/lib/auth/cta-state';

import { WhatIsMindsetisVideo } from './WhatIsMindsetisVideo';

/**
 * "What you actually get here" — Figma `1189:6273` ("Frame 664"). RE-VERIFIED against a raw
 * CSS dump + fresh `get_selection`/`get_screenshot` reads on both breakpoints (2026-08-31
 * follow-up — this pass fixes geometry/color the previous pixel-comparison pass got close but
 * not exact on):
 *
 * - Section side padding is **180px** on desktop (`Frame 664` left inset in the 1440 frame,
 *   confirmed by its own node bounds: `x:180` of a `1080`-wide box), NOT this page's usual
 *   shared `lg:px-[70px]` rhythm used by every sibling section (`HeroBand`, `ThreeWaysToStart`,
 *   `TopMindsettersSection`, etc.). This is a deliberate divergence in the Figma file for this
 *   one section — flagged here as a tradeoff since it breaks the page's visual rhythm, but the
 *   node data is unambiguous (matches independently on both the desktop `get_node` read and the
 *   mobile `get_selection` bounds), so faithfulness wins. Mobile padding (16px) already matched
 *   the shared `px-4` and needed no change.
 * - Text block ("Frame 431"/"Frame 534") is explicitly `width: 1080` (desktop) / `343` (mobile)
 *   in Figma, i.e. genuinely full-width, not capped — the previous pass's `max-w-2xl` on the
 *   subtitle and unconstrained-width text wrapper are both removed/widened to `w-full` to match.
 * - Eyebrow/heading/subtitle fills are **pure `#000000`**, no opacity — swapped the previous
 *   `text-black/70` / `text-black/80` approximations for plain `text-black`.
 * - Outer gap is **50px** desktop / **32px** mobile between the text block and the video (was
 *   approximated as 32/24). The video→button gap is different again — **50px** desktop (same
 *   rhythm) but only **16px** mobile (confirmed via the "Apply to Join" instance `1235:6528`
 *   desktop / `1262:24559` mobile, both real siblings of this section in the same page tree, not
 *   internal to "Frame 664"). Since a single flex `gap` can't express two different mobile gap
 *   values, the button gets a `-mt-4` counter-margin on mobile only.
 * - Video card corner radius is **32px desktop / 24px mobile** (`rounded-3xl` alone is only the
 *   24px mobile value — added `lg:rounded-[32px]`). Card itself now lives in the client
 *   `WhatIsMindsetisVideo` component (see below) so it can be interactive.
 *
 * Four open questions from the previous pass, answered by directly reading this session's
 * screenshots/node data (not guessed):
 * 1. **Play-overlay position** — genuinely centered in the card on both breakpoints; confirmed
 *    visually on fresh `get_screenshot` exports of `1189:6273` (desktop) and `1262:24545`
 *    (mobile). No change from the existing centered implementation.
 * 2. **"Apply to Join" (`1235:6528`)** — it exists and is real: a sibling node positioned
 *    directly below this section on both breakpoints (desktop `x:569,y:1949` vs. section bottom
 *    `y:1899` → 50px gap, centered on the 1440 canvas; mobile `1262:24559` at `x:16,y:1201` vs.
 *    section bottom `y:1185` → 16px gap, full page width). Kept in the code, gap corrected.
 *    Follow-up (same session): its node `padding` is `{top:15,bottom:15,left:20,right:20}` —
 *    the same 20px horizontal padding as the shared "Primary" component's `size="default"`
 *    (`px-5`), not `size="lg"`'s `px-8` — same fix already applied to `HeroBand`'s instances of
 *    this component. Its 302px desktop width is NOT hug-content: exporting the node and
 *    measuring the opaque pixel bounds (not just the reported bounding box, in case of
 *    shadow-bleed) shows the gradient pill's solid fill spans 301.75 of 302px — i.e. the
 *    instance genuinely has a fixed/overridden 302px width in Figma, with the icon+"Apply to
 *    Join" text (only one visible icon — `user-add-fill`; the other two `ball-pen-fill`/
 *    `account-pin-box-fill` children the MCP bridge reports are inactive alternate icon-slot
 *    variants, not actually rendered, confirmed by the screenshot) centered inside a wider-
 *    than-content pill, not a `w-fit` hug. Reproduced as a fixed `lg:w-[302px]` instead of
 *    `lg:w-fit`. `cornerRadius: 12` and the light-to-brand-blue diagonal gradient both match the
 *    shared component visually (screenshot) — that styling already lives in `Button`'s own
 *    variant classes, not duplicated here.
 * 3. **Eyebrow icon color** — the raw node fill genuinely is `#ffffff` on both breakpoints. An
 *    earlier pass here found a 6x-zoomed screenshot crop of just "Frame 17" showing **no visible
 *    icon at all** (white on this section's near-white/light-glow background is essentially
 *    invisible, ~2.8:1 contrast against the sampled glow color) and rendered it black instead —
 *    superseded the same day by the product owner confirming white is intentional (see the
 *    inline comment on the icon itself below), which is what actually ships. NOTE for whoever
 *    touches this next: the 2026-08-31 cross-section glow rewrite (point 4 below) measured this
 *    exact spot in the real Figma `bg` composite and it is NOT a distinct dark patch — it's the
 *    same light band as the rest of the text block, so the low-contrast finding from the earlier
 *    pass still holds against the accurately-reproduced background, not just the old
 *    approximation. Left as-is (product-owner call, outside that rewrite's scope) but flagged
 *    here so it isn't lost.
 * 4. **Light glow under the section** — this used to be a hand-tuned `radial-gradient` oval
 *    anchored to the text block, approximating the parent `bg` frame (`1189:6270`) that Figma
 *    draws behind hero/this section/"Three ways to start" as one continuous shape. That always
 *    clipped at this section's own edges (a "bounded blob" look, not the design's wide soft
 *    band) and couldn't extend into the neighboring sections it's supposed to span. Replaced
 *    (2026-08-31) with a real cross-section raster layer owned by `MainPageSection`, which wraps
 *    this component together with `ThreeWaysToStart` — see that file's own doc comment for the
 *    export/measurement details. This component no longer renders its own glow.
 *
 * BOTTOM BUTTON STATE (Release-1 A4, added 2026-09-17)
 *   Same `lib/auth/cta-state.ts` state as the header — this section's mapping matches the
 *   header's exactly (`Edit Profile` → `/continue`, `Upgrade` → `/mindsetter-onboarding/roles`,
 *   `Create Event` → the `NotYetAvailable` popup), unlike the hero's, which collapses both
 *   signed-in Member states into one "Explore Community" popup. The fixed `lg:w-[302px]` width
 *   (measured off the Figma "Apply to Join" instance above) is kept for every state, not just
 *   `guest`: all four labels are short enough to fit it comfortably (this button has no icon
 *   competing for the space at any state, unlike the header's fixed 199px CTA), so there is no
 *   hug-content case to make here.
 */
export async function WhatIsMindsetis() {
  const t = await getTranslations('home.main.whatIsMindsetis');
  const tNav = await getTranslations('nav');
  const ctaState = await resolveCtaState();

  return (
    <section id="how-it-works" className="relative overflow-hidden">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-8 px-4 pt-16 pb-10 sm:px-6 md:py-20 lg:items-start lg:gap-[50px] lg:px-[180px] lg:py-24">
        <div className="flex w-full flex-col items-start gap-6 lg:gap-8">
          <span className="inline-flex items-center gap-2">
            {/* White — the raw Figma fill on this instance, confirmed by the product owner
                2026-08-31 after an earlier pass had rendered it black on the assumption that
                white-on-light was an unfixed design slip. Deliberately NOT `currentColor`: the
                eyebrow label beside it is black, this glyph is not. */}
            <QuestionFillIcon className="size-3 text-white lg:size-4" />
            <span className="text-tiny leading-[16px] font-bold tracking-[0.3em] text-black uppercase lg:leading-[19px]">
              {t('eyebrow')}
            </span>
          </span>

          <div className="flex w-full flex-col gap-2 lg:gap-4">
            {/* `pb-1 lg:pb-2 -mb-1 lg:-mb-2`: same tight-`leading-[0.9]` descender crop as every
                other Main Page H2 — see `gradient-heading.ts`'s doc comment. This heading has no
                gradient/`bg-clip-text` (flat black fill), but the crop is a line-box/overflow
                issue, not a `bg-clip-text`-only one, so it still needs the fix. Uses `lg:` (not
                `md:`) to match this section's own breakpoint everywhere else. Negative margin
                cancels the padding back out of flow so the gap to the subtitle is unchanged. */}
            <h2 className="pb-1 font-display text-[2.5rem] leading-[0.9] font-normal text-black -mb-1 lg:pb-2 lg:-mb-2 lg:text-h2">
              {t('title')}
            </h2>
            <p className="w-full text-body leading-[22px] text-black">{t('subtitle')}</p>
          </div>
        </div>

        <WhatIsMindsetisVideo watchLabel={t('watchLabel')} />

        {ctaState === 'guest' ? (
          <Button
            asChild
            size="default"
            className="-mt-4 w-full lg:mt-0 lg:w-[302px] lg:self-center"
          >
            <Link href="/join">
              <JoinIcon />
              {tNav('join')}
            </Link>
          </Button>
        ) : null}

        {ctaState === 'memberIncomplete' ? (
          <Button
            asChild
            size="default"
            className="-mt-4 w-full lg:mt-0 lg:w-[302px] lg:self-center"
          >
            <Link href="/continue">{tNav('editProfile')}</Link>
          </Button>
        ) : null}

        {ctaState === 'memberComplete' ? (
          // `UpgradeToMindsetterTrigger`, not `Button asChild` + `Link` (Release-1 C7,
          // 2026-09-20): opens the `UpgradeToMindsetterDialog` confirmation instead of navigating
          // straight to `/mindsetter-onboarding/roles` — same change applied to the header's own
          // "Upgrade" CTA, see that call site's comment for the shared reasoning.
          <UpgradeToMindsetterTrigger
            size="default"
            className="-mt-4 w-full lg:mt-0 lg:w-[302px] lg:self-center"
          >
            {tNav('upgrade')}
          </UpgradeToMindsetterTrigger>
        ) : null}

        {ctaState === 'mindsetter' ? (
          <NotYetAvailable
            feature="createEvent"
            className="-mt-4 w-full lg:mt-0 lg:w-[302px] lg:self-center"
          >
            <Button type="button" disabled size="default" className="w-full">
              {tNav('createEvent')}
            </Button>
          </NotYetAvailable>
        ) : null}
      </div>
    </section>
  );
}
