'use client';

import { Play } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

export interface PromoVideoPlayerProps {
  /** Direct-upload file URL (`profile.promoVideoUrl`) — rendered via a native `<video>`. */
  videoUrl?: string | null;
  /** YouTube/Vimeo embed URL (`toEmbedUrl(profile.promoVideo?.youtube/.vimeo)`), used only when
   * there's no direct upload. */
  embedUrl?: string | null;
  /** `t('promo.heading')` — iframe `title` for a11y, matches the section heading. */
  title: string;
  /** `t('promo.clickToWatch')` — Figma's own caption under the play glyph (`552:4960` desktop /
   * `401:8076` mobile "Click for watching"), reused as the pre-play button's accessible name. */
  clickToWatchLabel: string;
  className?: string;
}

/**
 * Click-to-reveal video panel for the "Promo video" section (Figma `552:4953` "Frame 58" →
 * `552:4956` "Frame 37" desktop / `401:8072` mobile "Frame 37", both `cornerRadius: 16`,
 * `#1a1a1a` "grey shadow" fill): shows a plain dark portrait card with a centered brand-blue play
 * triangle + "Click for watching" caption BEFORE playback — not a native `<video>` poster/
 * scrubber and not an always-embedded iframe (that's what the previous build did). Extracted as
 * its own small client island — this page is otherwise a Server Component — since swapping the
 * thumbnail for the real player on click is genuine interactivity, same precedent as
 * `RolesAccordion`/`HelpWithAccordion`/`CardSlider` elsewhere on this page.
 */
/**
 * Appends autoplay params to a YouTube/Vimeo embed URL at reveal time (not baked into
 * `toEmbedUrl` itself, since that helper is shared with the always-embedded "Built Not Burn"
 * video-blog iframe, which must NOT autoplay on page load). YouTube uses `mute`, Vimeo uses
 * `muted` — setting both is harmless since each platform ignores the param it doesn't
 * recognize. Muted (not unmuted) autoplay is the safe choice: the click that reveals this
 * player is a genuine user gesture, but autoplay-with-sound permission doesn't reliably
 * propagate into a cross-origin iframe on every browser, so this guarantees playback actually
 * starts instead of silently sitting on the platform's own paused thumbnail.
 */
function withAutoplay(embedUrl: string): string {
  try {
    const url = new URL(embedUrl);
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('mute', '1');
    url.searchParams.set('muted', '1');
    return url.toString();
  } catch {
    return embedUrl;
  }
}

export function PromoVideoPlayer({
  videoUrl,
  embedUrl,
  title,
  clickToWatchLabel,
  className,
}: PromoVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!videoUrl && !embedUrl) return null;

  if (!isPlaying) {
    return (
      <button
        type="button"
        onClick={() => setIsPlaying(true)}
        className={cn(
          'flex size-full cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl bg-card',
          className,
        )}
      >
        <Play className="size-[50px] fill-primary text-primary" aria-hidden="true" />
        <span className="text-base font-bold text-foreground">{clickToWatchLabel}</span>
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
