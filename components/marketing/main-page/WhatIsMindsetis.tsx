import { getTranslations } from 'next-intl/server';

import { QuestionFillIcon } from '@/components/icons/main-page-icons';
import { VideoPlayIcon } from '@/components/icons/video-play-icon';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

/**
 * "What you actually get here" — Figma `1189:6273` ("Frame 664"). CORRECTED after a pixel
 * comparison against a live `get_screenshot` (2026-08-27 follow-up — the first pass got this
 * section wrong in several ways, corrected here):
 *
 * - Single stacked column, full-width, NOT a left-text/right-video split. The raw node bounds
 *   for the video ("Frame 37", `572:5515`) report `x:1080` inside a `1080`-wide parent (i.e.
 *   entirely outside it) at a portrait `610×1080` — both stale/pre-auto-layout artifacts this
 *   read-only MCP bridge exposes as-is; the actual rendered screenshot (authoritative for visual
 *   truth here) shows the video centered full-width BELOW the heading, at a landscape ~16:9
 *   ratio, not beside it.
 * - This section sits on a distinct LIGHT glow patch, not the page's black background — the
 *   parent `bg` frame (`1189:6270`) is a black rectangle, but two large blurred gradient
 *   "Vector" shapes inside it (no resolvable solid fill through this API) paint a soft white/
 *   blue radial glow across roughly this section's vertical span, confirmed by cropping the full
 *   page screenshot around this y-range (the isolated per-node export doesn't show it, since its
 *   own background is transparent/color-less until composited against that parent). Approximated
 *   below with a blurred radial-gradient div rather than reproducing the un-exportable gradient
 *   vectors exactly.
 * - Eyebrow/heading/subtitle are explicitly BLACK in Figma (not the page's usual white
 *   foreground) — this section is the one deliberately light-on-dark exception, same pattern as
 *   the white "Join Mindsetis Events" card in `ThreeWaysToStart`.
 * - "Apply to Join" (`1235:6528`) sits CENTERED below the video, not inline in a text column.
 *
 * The video placeholder itself still has no real video attached in Figma or a source in the app
 * — rendered as a static, non-interactive placeholder (`VideoPlayIcon` + "Click for watching",
 * same pairing as the profile page's `VideoBlogPlayer`) rather than wiring a `<video>` with
 * nothing to play.
 */
export async function WhatIsMindsetis() {
  const t = await getTranslations('home.main.whatIsMindsetis');
  const tNav = await getTranslations('nav');

  return (
    <section id="how-it-works" className="relative overflow-hidden">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start gap-6 px-4 py-16 sm:px-6 md:py-20 lg:gap-8 lg:px-[70px] lg:py-24">
        <div className="relative flex flex-col items-start gap-6 lg:gap-8">
          {/* Approximates Figma's un-exportable blurred gradient glow (see doc comment above) —
              a soft light patch directly behind this section's black eyebrow/heading/subtitle.
              Sized/anchored to the text block itself (not the whole section, which also holds
              the video's own opaque dark card) so the glow is actually strong where the black
              text sits, instead of fading out before reaching it. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[190%] w-[125%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.85)_40%,rgba(160,200,230,0.55)_70%,rgba(0,0,0,0)_100%)] blur-sm"
          />

          <span className="inline-flex items-center gap-1.5">
            <QuestionFillIcon className="size-4 text-black/70" />
            <span className="text-tiny font-bold tracking-[0.3em] text-black/70 uppercase">
              {t('eyebrow')}
            </span>
          </span>

          <div className="flex flex-col gap-4">
            <h2 className="font-display text-l leading-[0.9] font-normal text-black md:text-h2">
              {t('title')}
            </h2>
            <p className="max-w-2xl text-body text-black/80">{t('subtitle')}</p>
          </div>
        </div>

        <div className="relative flex aspect-video w-full items-center justify-center rounded-3xl bg-card">
          <div className="flex flex-col items-center gap-4">
            <VideoPlayIcon className="h-[35px] w-[29px] shrink-0" />
            <span className="text-body font-bold text-white">{t('watchLabel')}</span>
          </div>
        </div>

        <Button asChild size="lg" className="mx-auto w-fit">
          <Link href="/join">{tNav('join')}</Link>
        </Button>
      </div>
    </section>
  );
}
