'use client';

import { useEffect, useRef, useState } from 'react';

import { VideoPlayIcon } from '@/components/icons/video-play-icon';

/**
 * The Mindsetis promo (3:46) for the "What you actually get here" video card (Figma `1189:6273`,
 * "Frame 37"/"Frame 38"). Served from `public/videos/`: the client's 4K master
 * (`Promo MINDSETIS.mov`) re-encoded to 1080p H.264 ~1.6 Mbit/s + the original AAC track,
 * `+faststart` so playback starts before the whole file is downloaded. The poster is a frame
 * at ~0:56 of the same video (wide shot, mouth closed, looking at the camera).
 */
const PROMO_VIDEO_SRC = '/videos/promo-mindsetis.mp4';
const PROMO_POSTER_SRC = '/videos/promo-mindsetis-poster.webp';

type WhatIsMindsetisVideoProps = {
  /** "Click for watching" (`home.main.whatIsMindsetis.watchLabel`), passed down from the
   *  server-rendered parent so this client component doesn't need its own next-intl fetch.
   *  Reused as the overlay button's visible label/accessible name and the `<video>`'s
   *  `aria-label` — the design has no separate copy for either. */
  watchLabel: string;
};

/**
 * Facade over a native `<video>`: the card shows the poster dimmed, with the Figma play triangle
 * and label on top. `preload="none"` keeps the ~50 MB file off the wire until a visitor clicks.
 * The `<video>` is mounted from the start and `play()` is called inside the click handler itself,
 * so iOS Safari counts it as user-initiated and starts it with sound on the first tap. Native
 * controls appear only once it has started, so the dimmed poster matches the design until then.
 */
export function WhatIsMindsetisVideo({ watchLabel }: WhatIsMindsetisVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStarted, setIsStarted] = useState(false);

  // The overlay button unmounts on start; hand keyboard focus to the player (focusable once its
  // native controls render) instead of letting it fall back to <body>.
  useEffect(() => {
    if (isStarted) videoRef.current?.focus();
  }, [isStarted]);

  function handleStart() {
    const video = videoRef.current;
    if (!video) return;
    setIsStarted(true);
    // A refused play() (e.g. iOS Low Power Mode) leaves the native controls visible, so the
    // visitor can still press play themselves — nothing else to recover.
    video.play().catch(() => {});
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-card lg:rounded-[32px]">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full bg-black object-cover"
        src={PROMO_VIDEO_SRC}
        poster={PROMO_POSTER_SRC}
        preload="none"
        playsInline
        controls={isStarted}
        aria-label={watchLabel}
        // Until it starts, the overlay button is the one control — don't announce the label twice.
        aria-hidden={!isStarted}
      />
      {!isStarted && (
        <button
          type="button"
          onClick={handleStart}
          aria-label={watchLabel}
          className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-4 bg-black/45 transition-colors hover:bg-black/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {/* Icon sized to the real, rotation-corrected Figma triangle: ~19x23 on mobile
              ("Frame 38" @375), ~29x35 on desktop ("Frame 38" @1440) — see WhatIsMindsetis.tsx
              doc comment for how these were derived from the raw (rotated) MCP bounds. */}
          <VideoPlayIcon className="h-[23px] w-[19px] shrink-0 drop-shadow-md lg:h-[35px] lg:w-[29px]" />
          <span className="text-body font-bold text-white drop-shadow-md">{watchLabel}</span>
        </button>
      )}
    </div>
  );
}
