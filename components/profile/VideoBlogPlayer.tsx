'use client';

import { useRef, useState } from 'react';

import { VideoPlayIcon } from '@/components/icons/video-play-icon';

export interface VideoBlogPlayerProps {
  src: string;
  title: string;
  clickToWatchLabel: string;
}

/**
 * Video-blog / "BUILT NOT BURN · INTERVIEW" direct-upload player — isolated into its own small
 * `'use client'` component (same precedent as `ReviewQuoteText.tsx`/`EmblaCarousel.tsx`) purely
 * for the "Click for watching" play overlay (Figma `552:4667` "Frame 38": `VideoPlayIcon` +
 * centered white Manrope Bold 16px label, no letter-spacing, no dedicated scrim layer in the
 * design), which needs local `isPlaying` state — the parent `MindsetterProfileView.tsx` stays a
 * Server Component. The overlay hides itself once playback starts and the native `<video
 * controls>` bar takes over (Figma has no "return to overlay on pause" state to match, so this
 * doesn't try to re-show it on pause).
 */
export function VideoBlogPlayer({ src, title, clickToWatchLabel }: VideoBlogPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="relative size-full">
      <video
        ref={videoRef}
        src={src}
        title={title}
        controls={isPlaying}
        className="size-full object-cover"
        onPlay={() => setIsPlaying(true)}
      />
      {!isPlaying && (
        <button
          type="button"
          onClick={() => videoRef.current?.play()}
          className="absolute inset-0 flex flex-col items-center justify-center gap-4"
        >
          <VideoPlayIcon className="h-[35px] w-[29px] shrink-0" />
          <span className="text-body font-bold text-white">{clickToWatchLabel}</span>
        </button>
      )}
    </div>
  );
}
