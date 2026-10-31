'use client';

import { useEffect, useRef, useState } from 'react';

import { RegistrationBackLink } from '@/components/auth/RegistrationBackLink';
import { cn } from '@/lib/utils';

/**
 * The top-left Back of the screens that have NO primary button to carry it (`/welcome`,
 * `/mindsetter-onboarding/congrats`), kept in view while the page scrolls — at EVERY width,
 * phones included (owner's call, 31.10.2026).
 *
 * This box IS the Back: an in-flow, 24px-tall `position: sticky` block holding the link. At rest it
 * sits exactly where a plain Back would (the caller places it with margins), so nothing moves until
 * the page scrolls. It sticks 8px under the site header (`Header.tsx`: sticky, 70px tall, 88px from
 * `lg`) — `top` 78px, 96px from `lg` — so there is breathing room above the link.
 *
 * `sticky` needs a TALL containing block: the box must be a direct child of the page's wrapper, not
 * of a short header row (a sticky box can never leave its parent). Callers therefore render it as a
 * direct child of the wrapper and give it the position it needs per breakpoint. `/welcome`
 * (`RegistrationStepHeader`) renders TWO instances, one per layout — it hangs over the progress row
 * from `md`, and sits under the progress bar below `md` — and `className` hides the instance that
 * does not apply (`display: none`: not rendered, not focusable, nothing to measure). So exactly one
 * Back is ever visible/focusable and no invisible placeholder copy is needed.
 *
 * The box is `pointer-events-none` (it spans the whole content width and at rest overlays the
 * progress row at `md`), only the link and the stuck band take clicks.
 *
 * Once stuck, a band behind the link (the page's own background, NO border — owner's call,
 * 31.10.2026 — bleeding out to the page padding) keeps scrolling content from showing through the
 * 8px above and below the link. The band exists ONLY while stuck: at rest it would sit on top of
 * the registration progress bar sharing the row at `md` (on a 768px screen the two even overlap by
 * ~30px) and hide it.
 *
 * Stuck-ness is read with an IntersectionObserver whose root is shrunk by the sticky offset plus
 * the box's height (both read from the element, so the CSS stays the single source of truth): while
 * the box is above that line it is being held by `position: sticky`. Re-armed on resize, as the
 * offset changes at `lg` and the `className` visibility changes at `md`. CSS has no `:stuck`
 * selector, and reading the scroll position per frame would cost a layout read each time.
 */
export function StickyBackLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  /** Where the box sits at rest and at which widths it exists: margins, `hidden md:block`, … */
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    let observer: IntersectionObserver | undefined;
    const observe = () => {
      observer?.disconnect();
      const top = Number.parseFloat(getComputedStyle(element).top);
      if (Number.isNaN(top)) return;
      const { height } = element.getBoundingClientRect();
      observer = new IntersectionObserver(
        ([entry]) => {
          // A `display: none` instance reports an empty rect: never "stuck".
          setIsStuck(!!entry && !entry.isIntersecting && entry.boundingClientRect.height > 0);
        },
        // Top: the sticky offset plus the box's height (+1px), i.e. the box counts as "above" the
        // moment its top edge reaches the offset — when it is held. The other sides are widened so
        // only the vertical position decides.
        { rootMargin: `${-(top + height + 1)}px 50% 50% 50%` },
      );
      observer.observe(element);
    };

    observe();
    window.addEventListener('resize', observe);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', observe);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn('pointer-events-none sticky top-[78px] z-30 lg:top-[96px]', className)}
    >
      {/* 40px band: the 24px link with 8px above (hidden under the header) and 8px below. `-z-10`
          keeps it behind the link, inside this box's own stacking context. The insets match the
          page wrapper's horizontal padding (16 / 24 from `sm` / 70 from `lg`), so it bleeds exactly
          to the viewport edge without overflowing it. */}
      {isStuck ? (
        <span
          aria-hidden="true"
          className="pointer-events-auto absolute -inset-x-4 -top-2 -z-10 h-10 bg-background sm:-inset-x-6 lg:-inset-x-[70px]"
        />
      ) : null}
      <RegistrationBackLink href={href} label={label} className="pointer-events-auto" />
    </div>
  );
}
