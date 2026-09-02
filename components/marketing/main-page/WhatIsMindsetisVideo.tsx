'use client';

import { useState } from 'react';

import { VideoPlayIcon } from '@/components/icons/video-play-icon';

/**
 * Placeholder video for the "What you actually get here" video card (Figma `1189:6273`,
 * "Frame 37"/"Frame 38" — no real video is wired up in the design or the app yet). Big Buck
 * Bunny is an open Creative Commons short film: neutral, safe-to-show content while the facade
 * below is wired up. TODO: swap this for the real Mindsetis promo video once one exists.
 */
const PLACEHOLDER_YOUTUBE_VIDEO_ID = 'aqz-KE-bpKQ';

type WhatIsMindsetisVideoProps = {
  /** "Click for watching" (`home.main.whatIsMindsetis.watchLabel`), passed down from the
   *  server-rendered parent so this client component doesn't need its own next-intl fetch.
   *  Reused as both the overlay button's visible label/accessible name and the iframe's
   *  `title` — the design has no separate copy for either, so duplicating this one string
   *  avoids inventing a new i18n key for a placeholder video. */
  watchLabel: string;
};

/**
 * Facade pattern: renders the static Figma placeholder (dark card + play triangle + label) by
 * default, and swaps in a real playing YouTube iframe only after the user clicks — so the
 * section never loads/executes an embed nobody asked to watch.
 */
export function WhatIsMindsetisVideo({ watchLabel }: WhatIsMindsetisVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-card lg:rounded-[32px]">
      {isPlaying ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${PLACEHOLDER_YOUTUBE_VIDEO_ID}?autoplay=1`}
          title={watchLabel}
          allow="accelerated-motion; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsPlaying(true)}
          aria-label={watchLabel}
          className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {/* Icon sized to the real, rotation-corrected Figma triangle: ~19x23 on mobile
              ("Frame 38" @375), ~29x35 on desktop ("Frame 38" @1440) — see WhatIsMindsetis.tsx
              doc comment for how these were derived from the raw (rotated) MCP bounds. */}
          <VideoPlayIcon className="h-[23px] w-[19px] shrink-0 lg:h-[35px] lg:w-[29px]" />
          <span className="text-body font-bold text-white">{watchLabel}</span>
        </button>
      )}
    </div>
  );
}
