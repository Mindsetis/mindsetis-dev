'use client';

import { Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export interface PromoVideoPlayerProps {
  /** Direct-upload file URL (`profile.promoVideoUrl`) — rendered via a native `<video>`. */
  videoUrl?: string | null;
  /** YouTube/Vimeo embed URL (`toEmbedUrl(profile.promoVideo?.youtube/.vimeo)`), used only when
   * there's no direct upload. */
  embedUrl?: string | null;
  /** Cover image shown dimmed behind the play glyph BEFORE playback (the page resolves the
   * priority: member's own thumbnail > Vimeo `thumbnail_url` > YouTube image). Absent = the plain
   * dark panel. */
  posterUrl?: string | null;
  /** `t('promo.heading')` — iframe `title` for a11y, matches the section heading. */
  title: string;
  /** `t('promo.clickToWatch')` — Figma's own caption under the play glyph (`552:4960` desktop /
   * `401:8076` mobile "Click for watching"), reused as the pre-play button's accessible name. */
  clickToWatchLabel: string;
  className?: string;
}

/**
 * Appends autoplay to a YouTube/Vimeo embed URL at reveal time (not baked into `toEmbedUrl`
 * itself, since that helper is shared with the always-embedded "Built Not Burn" video-blog
 * iframe, which must NOT autoplay on page load).
 *
 * Plays WITH sound (client request 06.11.2026 — the video blog already does): neither `mute` nor
 * `muted` is set. The click that reveals the player is a genuine user gesture and the iframe's
 * `allow="autoplay"` delegates it. Accepted trade-off: where a browser still refuses unmuted
 * autoplay inside the cross-origin iframe (iOS Safari), the provider's own play button shows and
 * one more tap starts the video.
 */
function withAutoplay(embedUrl: string): string {
  try {
    const url = new URL(embedUrl);
    url.searchParams.set('autoplay', '1');
    return url.toString();
  } catch {
    return embedUrl;
  }
}

/**
 * Click-to-reveal video panel for the "Promo video" section (Figma `552:4953` "Frame 58" →
 * `552:4956` "Frame 37" desktop / `401:8072` mobile "Frame 37", both `cornerRadius: 16`,
 * `#1a1a1a` "grey shadow" fill). BEFORE playback it shows a cover image (when there is one) dimmed
 * like the home page's promo card (`WhatIsMindsetisVideo.tsx`: `bg-black/45`, hover `/35`) with a
 * brand-blue play triangle + "Click for watching" caption on top; without a cover it is the plain
 * dark panel. Not a native `<video>` poster/scrubber and not an always-embedded iframe. Its own
 * small client island — this page is otherwise a Server Component — since swapping the cover for
 * the real player on click is genuine interactivity, same precedent as
 * `RolesAccordion`/`HelpWithAccordion`/`CardSlider` elsewhere on this page.
 */
export function PromoVideoPlayer({
  videoUrl,
  embedUrl,
  posterUrl,
  title,
  clickToWatchLabel,
  className,
}: PromoVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  // A cover that fails to load (expired signed URL, deleted object) falls back to the dark panel
  // rather than showing a broken-image icon behind the dimming layer.
  const [posterFailed, setPosterFailed] = useState(false);
  const [lastPosterUrl, setLastPosterUrl] = useState(posterUrl);
  const posterRef = useRef<HTMLImageElement>(null);

  // A new cover URL gets a fresh chance (state adjusted during render, React's documented pattern).
  if (posterUrl !== lastPosterUrl) {
    setLastPosterUrl(posterUrl);
    setPosterFailed(false);
  }

  // The <img> is server-rendered, so a load error that fires before hydration never reaches
  // React's `onError`; the finished-but-empty state is still readable afterwards.
  useEffect(() => {
    const img = posterRef.current;
    if (img && img.complete && img.naturalWidth === 0) setPosterFailed(true);
  }, [posterUrl, posterFailed]);

  if (!videoUrl && !embedUrl) return null;

  if (!isPlaying) {
    const showPoster = Boolean(posterUrl) && !posterFailed;

    return (
      <button
        type="button"
        onClick={() => setIsPlaying(true)}
        className={cn(
          'group relative flex size-full cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl bg-card',
          className,
        )}
      >
        {showPoster ? (
          <>
            {/* Plain <img>: signed Storage / CDN URLs aren't in next/image's remotePatterns. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={posterRef}
              src={posterUrl ?? undefined}
              alt=""
              className="absolute inset-0 size-full object-cover"
              onError={() => setPosterFailed(true)}
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-black/45 transition-colors group-hover:bg-black/35"
            />
          </>
        ) : null}
        <Play
          className={cn(
            'relative size-[50px] fill-primary text-primary',
            showPoster && 'drop-shadow-md',
          )}
          aria-hidden="true"
        />
        <span
          className={cn(
            'relative text-base font-bold text-foreground',
            showPoster && 'text-white drop-shadow-md',
          )}
        >
          {clickToWatchLabel}
        </span>
      </button>
    );
  }

  return (
    <div className={cn('overflow-hidden rounded-2xl bg-card', className)}>
      {videoUrl ? (
        <video src={videoUrl} controls autoPlay className="size-full object-cover" />
      ) : (
        <iframe
          className="size-full"
          src={embedUrl ? withAutoplay(embedUrl) : undefined}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  );
}
