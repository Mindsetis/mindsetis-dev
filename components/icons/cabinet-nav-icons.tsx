import type { SVGProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * Cabinet sidebar nav icons (`components/dashboard/CabinetSidebar.tsx`) — all six provided
 * verbatim by the designer (2026-08-10), grouped in one file the same way `profile-meta-icons.tsx`
 * groups the Member Profile's meta-row glyphs: distinct icons used together by one screen area.
 *
 * All native 24×24 — the sidebar renders them at `size-6` (24px), no scaling.
 *
 * THREE of the six (`OverviewIcon`/`BookingsIcon`/`EarningsIcon`) sit permanently inside
 * `NotYetAvailableItem` — genuinely inert, never clickable, never "active". Those keep their paths'
 * hardcoded `fill="white"` and the designer's own per-icon REST opacity (0.55 for `OverviewIcon`,
 * 0.45 for the rest) baked in via an inline `<g opacity>`, unaffected by anything the surrounding
 * row does.
 *
 * `MyProfileIcon`, `CabinetSettingsIcon` and `SessionsSetupIcon` are the exceptions — the
 * sidebar's real, clickable, activatable rows — and their color/opacity model is deliberately
 * DIFFERENT (2026-08-10 product decision, reversing an earlier "icon never recolors" call from the
 * same day): their paths use `fill="currentColor"` so they follow the `<Link>`'s own text color
 * (white at rest/hover, `text-primary` when active — see `CabinetSidebar.tsx`), and their opacity
 * moves from a static SVG attribute to Tailwind classes (`opacity-45` rest,
 * `group-hover:opacity-100`, `active` prop → `opacity-100`) so it can actually respond to
 * `:hover`, which a hardcoded attribute value never could. Each joined the moment its page became
 * real: Settings on 2026-08-11, Sessions Setup on 2026-08-13.
 */
export type NavIconProps = SVGProps<SVGSVGElement> & {
  /** Full white (opacity 1) when the icon's nav row is the active one; the icon's own designed
   * rest-state opacity otherwise. */
  active?: boolean;
};

export function OverviewIcon({ active = false, ...props }: NavIconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <g opacity={active ? 1 : 0.55}>
        <path
          d="M8.8 3H5.2C3.98497 3 3 3.98497 3 5.2V8.8C3 10.015 3.98497 11 5.2 11H8.8C10.015 11 11 10.015 11 8.8V5.2C11 3.98497 10.015 3 8.8 3Z"
          fill="white"
        />
        <path
          d="M18.8 3H15.2C13.985 3 13 3.98497 13 5.2V8.8C13 10.015 13.985 11 15.2 11H18.8C20.015 11 21 10.015 21 8.8V5.2C21 3.98497 20.015 3 18.8 3Z"
          fill="white"
        />
        <path
          d="M8.8 13H5.2C3.98497 13 3 13.985 3 15.2V18.8C3 20.015 3.98497 21 5.2 21H8.8C10.015 21 11 20.015 11 18.8V15.2C11 13.985 10.015 13 8.8 13Z"
          fill="white"
        />
        <path
          d="M18.8 13H15.2C13.985 13 13 13.985 13 15.2V18.8C13 20.015 13.985 21 15.2 21H18.8C20.015 21 21 20.015 21 18.8V15.2C21 13.985 20.015 13 18.8 13Z"
          fill="white"
        />
      </g>
    </svg>
  );
}

export function BookingsIcon({ active = false, ...props }: NavIconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <g opacity={active ? 1 : 0.45}>
        <path
          d="M7.6 2.19995C8.26 2.19995 8.8 2.73995 8.8 3.39995V4.49995H15.2V3.39995C15.2 3.08169 15.3264 2.77647 15.5515 2.55142C15.7765 2.32638 16.0817 2.19995 16.4 2.19995C16.7183 2.19995 17.0235 2.32638 17.2485 2.55142C17.4736 2.77647 17.6 3.08169 17.6 3.39995V4.49995H18C18.7956 4.49995 19.5587 4.81602 20.1213 5.37863C20.6839 5.94124 21 6.7043 21 7.49995V8.49995H3V7.49995C3 6.7043 3.31607 5.94124 3.87868 5.37863C4.44129 4.81602 5.20435 4.49995 6 4.49995H6.4V3.39995C6.4 2.73995 6.94 2.19995 7.6 2.19995Z"
          fill="white"
        />
        <path
          d="M3 10.8999H21V18.1999C21 18.9956 20.6839 19.7586 20.1213 20.3212C19.5587 20.8838 18.7956 21.1999 18 21.1999H6C5.20435 21.1999 4.44129 20.8838 3.87868 20.3212C3.31607 19.7586 3 18.9956 3 18.1999V10.8999Z"
          fill="white"
        />
      </g>
    </svg>
  );
}

export function SessionsSetupIcon({ active = false, className, ...props }: NavIconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={cn(
        'opacity-45 transition-opacity group-hover:opacity-100',
        active && 'opacity-100',
        className,
      )}
      {...props}
    >
      <path d="M19.85 5.3999H4.15C3.51487 5.3999 3 5.91477 3 6.5499C3 7.18503 3.51487 7.6999 4.15 7.6999H19.85C20.4851 7.6999 21 7.18503 21 6.5499C21 5.91477 20.4851 5.3999 19.85 5.3999Z" />
      <path d="M19.85 16.3H4.15C3.51487 16.3 3 16.8149 3 17.4501C3 18.0852 3.51487 18.6 4.15 18.6H19.85C20.4851 18.6 21 18.0852 21 17.4501C21 16.8149 20.4851 16.3 19.85 16.3Z" />
      <path d="M10.4 4.40005C10.4 3.51639 9.68361 2.80005 8.79995 2.80005C7.9163 2.80005 7.19995 3.51639 7.19995 4.40005V8.70005C7.19995 9.5837 7.9163 10.3 8.79995 10.3C9.68361 10.3 10.4 9.5837 10.4 8.70005V4.40005Z" />
      <path d="M16.8 15.3C16.8 14.4163 16.0836 13.7 15.2 13.7C14.3163 13.7 13.6 14.4163 13.6 15.3V19.6C13.6 20.4836 14.3163 21.2 15.2 21.2C16.0836 21.2 16.8 20.4836 16.8 19.6V15.3Z" />
    </svg>
  );
}

export function EarningsIcon({ active = false, ...props }: NavIconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <g opacity={active ? 1 : 0.45}>
        <path
          d="M6.2 5.19995H17.8C18.6487 5.19995 19.4626 5.53709 20.0627 6.13721C20.6629 6.73733 21 7.55126 21 8.39995V9.09995H3V8.39995C3 7.55126 3.33714 6.73733 3.93726 6.13721C4.53737 5.53709 5.35131 5.19995 6.2 5.19995Z"
          fill="white"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M3 11.1001H21V16.6001C21 17.4488 20.6629 18.2627 20.0627 18.8628C19.4626 19.463 18.6487 19.8001 17.8 19.8001H6.2C5.35131 19.8001 4.53737 19.463 3.93726 18.8628C3.33714 18.2627 3 17.4488 3 16.6001V11.1001ZM16.5 15.7001C16.8978 15.7001 17.2794 15.5421 17.5607 15.2608C17.842 14.9795 18 14.5979 18 14.2001C18 13.8023 17.842 13.4207 17.5607 13.1394C17.2794 12.8581 16.8978 12.7001 16.5 12.7001C16.1022 12.7001 15.7206 12.8581 15.4393 13.1394C15.158 13.4207 15 13.8023 15 14.2001C15 14.5979 15.158 14.9795 15.4393 15.2608C15.7206 15.5421 16.1022 15.7001 16.5 15.7001Z"
          fill="white"
        />
      </g>
    </svg>
  );
}

export function CabinetSettingsIcon({ active = false, className, ...props }: NavIconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={cn(
        'opacity-45 transition-opacity group-hover:opacity-100',
        active && 'opacity-100',
        className,
      )}
      {...props}
    >
      <path d="M5.16739 4.93961C6.13193 4.07909 7.27388 3.41213 8.53177 3C9.22813 3.86733 10.299 4.42281 11.5 4.42281C12.701 4.42281 13.7718 3.86733 14.4683 3C15.7262 3.41213 16.8681 4.07909 17.8326 4.93961C17.4285 5.97398 17.4818 7.17525 18.0818 8.21141C18.6822 9.24815 19.6998 9.89497 20.8011 10.0627C20.9315 10.6881 21 11.3361 21 12C21 12.6639 20.9315 13.3119 20.8011 13.9372C19.6998 14.1051 18.6822 14.7519 18.0818 15.7886C17.4818 16.8247 17.4285 18.0261 17.8326 19.0603C16.8681 19.9209 15.7262 20.5879 14.4683 21C13.7718 20.1327 12.701 19.5772 11.5 19.5772C10.299 19.5772 9.22813 20.1327 8.53177 21C7.27388 20.5879 6.13193 19.9209 5.16739 19.0603C5.57154 18.0261 5.51823 16.8247 4.91821 15.7886C4.31784 14.7519 3.30019 14.1051 2.19888 13.9372C2.06851 13.3119 2 12.6639 2 12C2 11.3361 2.06851 10.6881 2.19888 10.0627C3.30019 9.89497 4.31784 9.24815 4.91821 8.21141C5.51823 7.17525 5.57154 5.97398 5.16739 4.93961ZM12.925 14.4608C14.2882 13.6761 14.7552 11.9384 13.9682 10.5793C13.1811 9.22023 11.4382 8.75459 10.075 9.53923C8.71186 10.3238 8.24483 12.0617 9.03182 13.4207C9.81888 14.7798 11.5618 15.2454 12.925 14.4608Z" />
    </svg>
  );
}

export function MyProfileIcon({ active = false, className, ...props }: NavIconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={cn(
        'opacity-45 transition-opacity group-hover:opacity-100',
        active && 'opacity-100',
        className,
      )}
      {...props}
    >
      <path d="M12 11.6001C14.2091 11.6001 16 9.80924 16 7.6001C16 5.39096 14.2091 3.6001 12 3.6001C9.79086 3.6001 8 5.39096 8 7.6001C8 9.80924 9.79086 11.6001 12 11.6001Z" />
      <path d="M12 13.2C7.79999 13.2 4.39999 15.9 4.39999 19.2C4.39999 20.1 5.09999 20.8 5.99999 20.8H18C18.9 20.8 19.6 20.1 19.6 19.2C19.6 15.9 16.2 13.2 12 13.2Z" />
    </svg>
  );
}
