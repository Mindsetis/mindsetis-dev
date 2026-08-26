'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { SectionInfoIcon } from '@/components/icons/profile-section-icons';
import type { ProfileSectionKey } from '@/lib/profile/completeness';
import type { AccountType } from '@/lib/validation/roles';

type SectionPreview = {
  /** Static asset under `public/previews/`. */
  src: string;
  /** Rendered size in CSS px — the Figma mockup's own size, not the file's (exported at 3x). */
  width: number;
  height: number;
};

/**
 * Which sections have a "how it looks on your profile" mockup, and where it lives.
 *
 * These are SCREENSHOTS of the public profile, exported from Figma — deliberately not a live
 * render of the member's own data. `MindsetterProfileView` is one 2300-line component with every
 * section inline (carousels, CSS modules, per-breakpoint variants) and an unconditional hero /
 * reviews / CTA, so there is no section to mount on its own; extracting one would be a rewrite of
 * the public profile, not a tooltip. The design treats this as an illustration too ("приблизно як
 * буде виглядати"), so a static image matches both the intent and the cost.
 *
 * Social links is the one section left without a preview: its links surface as a row of icons
 * inside the Hero banner, so it has no block of its own to illustrate.
 *
 * Sourcing (2026-08-11): `reelLife`, `myWay`, `videoBlog` and `superpowers` are CROPS out of one
 * full-page export of the profile frame, not per-node exports. Those four have no node holding
 * heading + content together — the timeline steps and the video card are unparented siblings of
 * their headings — so a per-node export yields a bare section title or an empty player. Cropping
 * the rendered page by coordinates sidesteps the layer structure entirely. It also fixed
 * `superpowers`, which previously came from the tooltip's own mockup in Figma and carried a baked-in
 * rounded border that clashed with the frame this component draws.
 *
 * `wins` and `fckups` are carousels far wider than the panel, so their images end mid-card on the
 * right — which is what the profile itself does, so it reads correctly rather than as a defect.
 *
 * Both Hero banners come from the frames where the account dropdown is CLOSED (`383:2070` and
 * `401:6375`) rather than the ones the other sections were cut from — in those, an open
 * "View public profile / Settings / Log out" menu sits on top of the portrait and can't be cropped
 * away without losing the photo. The content is otherwise identical.
 *
 * All files are stored at 976px wide — 2x the panel's 488px content width, so they stay sharp on
 * retina without shipping the 3–5x originals. The JPEGs are the photo-heavy ones (`reelLife` and
 * both Hero banners), where PNG cost 2.9 MB against 146 KB for the same picture.
 *
 * Heights are the rendered size at 488px wide (i.e. half the stored pixel height); the CSS scales
 * to `w-full`, so these only pin the aspect ratio.
 */
export const SECTION_PREVIEWS: Partial<Record<ProfileSectionKey, SectionPreview>> = {
  roles: { src: '/previews/roles-preview.png', width: 488, height: 177 },
  superpowers: { src: '/previews/superpowers-preview.png', width: 488, height: 212 },
  helpWith: { src: '/previews/help-with-preview.png', width: 488, height: 173 },
  promoVideo: { src: '/previews/promo-video-preview.png', width: 488, height: 245 },
  reelLife: { src: '/previews/reel-life-preview.jpg', width: 488, height: 423 },
  numbers: { src: '/previews/numbers-preview.png', width: 488, height: 164 },
  wins: { src: '/previews/wins-preview.png', width: 488, height: 148 },
  myWay: { src: '/previews/my-way-preview.png', width: 488, height: 230 },
  fckups: { src: '/previews/fckups-preview.png', width: 488, height: 181 },
  videoBlog: { src: '/previews/video-blog-preview.png', width: 488, height: 162 },
};

/**
 * Hero is the ONE section whose preview depends on who is looking: a Member's public page and a
 * Mindsetter's are different pages with different banners, and both account types edit Hero from
 * the same route with the same form. Showing a Mindsetter banner to a Member would illustrate a
 * page they will never have.
 */
const HERO_PREVIEWS: Record<AccountType, SectionPreview> = {
  member: { src: '/previews/hero-member-preview.jpg', width: 488, height: 244 },
  mindsetter: { src: '/previews/hero-mindsetter-preview.jpg', width: 488, height: 234 },
};

function resolvePreview(
  sectionKey: ProfileSectionKey,
  accountType: AccountType,
): SectionPreview | undefined {
  return sectionKey === 'hero' ? HERO_PREVIEWS[accountType] : SECTION_PREVIEWS[sectionKey];
}

export type SectionPreviewHintProps = {
  sectionKey: ProfileSectionKey;
  /** Only consulted for `hero`; every other section looks the same on either public page. */
  accountType: AccountType;
};

/**
 * The ⓘ glyph beside a section editor's title (Figma "Preview hint" icon opens "Preview tooltip",
 * `985:13168` — node IDs on this instance-per-section icon churn, so look it up by name).
 *
 * For a section WITH a preview it becomes a button that floats the mockup panel next to the title;
 * for every other section it stays the inert glyph it already was, so nothing promises a panel
 * that doesn't exist.
 *
 * Opens on hover AND on click: hover is the desktop gesture the design shows, but it doesn't
 * exist on touch, so the click keeps phones working. Click only ever OPENS (never toggles) —
 * a mouse click is preceded by `mouseenter`, so a toggle would read as "clicking the icon closes
 * it". Dismissal is uniform instead: pointer leaves, tap outside, or Escape.
 */
export function SectionPreviewHint({ sectionKey, accountType }: SectionPreviewHintProps) {
  const t = useTranslations('dashboard.profile.preview');
  const preview = resolvePreview(sectionKey, accountType);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open]);

  // Sections without a mockup keep the previous non-interactive glyph — same resting and hover
  // colours, but no button semantics and no pointer cursor.
  if (!preview) {
    return (
      <SectionInfoIcon className="size-[17px] shrink-0 text-muted-foreground opacity-75 transition hover:text-primary hover:opacity-100" />
    );
  }

  return (
    <span
      ref={wrapperRef}
      className="relative flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={t('toggle')}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="flex cursor-pointer items-center rounded-full text-muted-foreground opacity-75 transition hover:text-primary hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-expanded:text-primary aria-expanded:opacity-100"
      >
        <SectionInfoIcon className="size-[17px] shrink-0" />
      </button>

      {open ? (
        // `pointer-events-none` so the panel can overlap the form (as in the design) without ever
        // swallowing a click meant for a field underneath — nothing inside it is interactive.
        //
        // Beside the icon from `md` up (the design's placement); PINNED TO THE VIEWPORT BOTTOM
        // below that. A 520px panel can't sit next to a title on a phone, and anchoring it to the
        // icon isn't a fix either — the icon follows the title text, so an absolutely positioned
        // panel starts wherever that text ends and runs off-screen (measured 2026-08-11 at 390px:
        // the panel reached x=700 and gave the page 366px of horizontal scroll). Fixed insets make
        // the placement independent of where in the row the icon happens to land.
        <span
          role="tooltip"
          className="pointer-events-none fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-[520px] flex-col gap-3 rounded-xl border border-[#2a2a2a] bg-white p-4 text-black shadow-[0_24px_60px_0_rgba(0,0,0,0.55)] select-none md:absolute md:inset-x-auto md:top-0 md:bottom-auto md:left-[calc(100%+12px)] md:mx-0 md:w-[520px] md:max-w-none"
        >
          <span className="text-[11px] leading-[120%] font-bold tracking-[0.3em] text-black uppercase">
            {t('label')}
          </span>
          {/* The frame and its 12px inner padding live on this wrapper, NOT on the `img`. Every
              export is a tight crop of its Figma node, so the section's own heading would
              otherwise sit flush against the border. Padding the `img` directly would distort it:
              `width`/`height` give it an intrinsic `aspect-ratio`, which under `box-sizing:
              border-box` applies to the BORDER box, so the content box ends up a different ratio
              and the default `object-fit: fill` squashes the picture (~12% at these sizes).

              `bg-background` is NOT decoration: every PNG export is RGBA with a TRANSPARENT
              background (the profile page's own black never made it into the crop), so on the
              panel's white the mockups' light-on-dark text all but vanished — measured on the
              live page 2026-08-18. The black underlay restores the contrast the section has on
              the real profile, and makes the padding read as breathing room around the mockup
              rather than a white gutter. The JPEGs carry their background already. */}
          <span className="block overflow-hidden rounded-[10px] border border-border bg-background p-3">
            {/* Decorative: the label above already says what this is, and the mockup's own text is
                sample copy, not the member's data — announcing it would be misleading. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.src}
              alt=""
              width={preview.width}
              height={preview.height}
              className="block h-auto w-full"
            />
          </span>
        </span>
      ) : null}
    </span>
  );
}
