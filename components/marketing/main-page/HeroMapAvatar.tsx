'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

type HeroMapAvatarProps = {
  id: string;
  left: number;
  top: number;
  width: number;
  /** `getHeroMapPulseStyle(id)` — the idle pulse's delay/duration, or `undefined` for none. */
  pulseStyle?: Record<string, string>;
  /** `getHeroMapAppearStyle(id)` — this avatar's scattered entrance delay + duration. */
  appearStyle: Record<string, string>;
};

/**
 * One person on the hero map, with its entrance animation (client request, 2026-09-29): the
 * photo pops in (fade + grow from nothing, with an overshoot) once ITS OWN file has loaded, at its
 * own scattered delay and pace (`appearStyle`) — a chaotic burst, not an ordered sweep. Keyed to the load rather than to page mount so a slow
 * connection never plays the animation over an empty box and then flashes the photo in late.
 *
 * `data-loaded` is set from `onLoad`, and ALSO from a mount-time `complete` check: a cached image
 * (or one that finished before hydration) has already fired its load event by the time React
 * attaches the handler, and would otherwise stay invisible.
 *
 * The entrance animates the individual `scale` property on the wrapper, so it neither fights the
 * wrapper's inline centering `transform` nor the photo's own idle pulse (`transform: scale` on the
 * `<img>`, `hero-map-avatar-pulse-scale`). Markup is otherwise unchanged from when `HeroBand`
 * rendered these inline — see its "HERO MAP" doc comments for the layer/lazy-loading rationale.
 */
export function HeroMapAvatar({
  id,
  left,
  top,
  width,
  pulseStyle,
  appearStyle,
}: HeroMapAvatarProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <span
      className="hero-map-avatar-appear absolute"
      data-loaded={loaded ? '' : undefined}
      // Cast: custom properties aren't part of React's typed `CSSProperties` surface — same escape
      // hatch as `ScrollToTopButton`'s `--cookie-banner-offset`.
      style={
        {
          left: `${left}%`,
          top: `${top}%`,
          width: `${width}%`,
          transform: 'translate(-50%, -50%)',
          ...appearStyle,
          ...pulseStyle,
        } as CSSProperties
      }
    >
      {/* Decorative glow layer, BEFORE the photo in the DOM on purpose: an absolutely-positioned
          sibling paints above a `position: static` element regardless of DOM order, so the
          `<img>` below needs (and gets) its own `relative` to end up on top of this. */}
      {pulseStyle ? <span aria-hidden="true" className="hero-map-avatar-glow" /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element -- local static asset, same precedent as the map's base layer in HeroBand */}
      <img
        ref={imgRef}
        src={`/images/hero-map/${id}.webp`}
        alt=""
        aria-hidden="true"
        // `lazy` doubles as the breakpoint-exclusion mechanism (a `display: none` layer is never
        // near the viewport, so its files are never fetched); `async` decoding keeps the pins
        // off the main thread next to the base layer, this section's largest paint.
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          'hero-map-avatar-photo relative block h-auto w-full',
          pulseStyle && 'hero-map-avatar-pulse-scale',
        )}
      />
    </span>
  );
}
