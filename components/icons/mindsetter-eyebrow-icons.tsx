/**
 * Exact Figma vectors for the Mindsetter Full Profile's section eyebrows/accordion glyphs
 * (`327:1080` desktop "Public Mindsetter's Full Profile" / `187:4294` mobile) — pixel-polish
 * follow-up to stage 1.10 (ROADMAP "Polish / follow-up" list item 3: "A few eyebrow icons are
 * temporary lucide glyphs (Roles / Topics / Superpowers / Help / Reviews), not the exact Figma
 * vectors"). Same precedent as `components/icons/shine-block-icons.tsx`'s `SHINE_BLOCK_ICONS`
 * (and unlike `profile-meta-icons.tsx`'s `currentColor` icons): every glyph below is provided
 * verbatim by the designer with a hardcoded brand-blue `#79B9E3` fill, not `currentColor` — the
 * Figma source never varies these by context (every eyebrow/role-index instance across both
 * breakpoints uses the identical fill), so hardcoding matches the source of truth exactly and
 * avoids a class of "forgot to set text color" bugs a `currentColor` icon would risk here.
 *
 * `IndeterminateCircleFillIcon` / `AddCircleFillIcon` are the two Roles-accordion toggle states
 * (`indeterminate-circle-fill` = expanded/"−", `add-circle-fill` = collapsed/"+") — see
 * `RolesAccordion.tsx` for how they're wired up. Figma's `add-circle-fill` (collapsed) instance
 * is filled plain white (`#FFFFFF`, meant for the page's actual dark background, see that
 * component's own doc comment on the light/dark theme discrepancy) — exported here as
 * `currentColor` instead of a hardcoded white so the caller can recolor it to something that
 * actually reads on this screen's deliberate light `#FFFFFF` section (a muted border-gray,
 * matching the row's own divider color) rather than rendering an invisible white-on-white glyph.
 * `indeterminate-circle-fill` (expanded) keeps Figma's real hardcoded brand blue unchanged —
 * that color already reads fine on any background.
 */
import type { SVGProps } from 'react';

type IconProps = { className?: string };

/** "Roles" section eyebrow (`327:1127` eyebrow instance) AND each per-role accordion header's
 * index icon (`371:1255` etc. — the SAME component instance, just reused per row in Figma) —
 * one export covers both call sites. */
export function MagicFillIcon({ className }: IconProps) {
  return (
    <svg className={className ?? 'size-3.5'} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M8.87973 9.04624L7.58899 11.7589C7.50593 11.9334 7.29709 12.0075 7.12256 11.9245C7.08365 11.906 7.04848 11.8804 7.01884 11.8492L4.95302 9.6682C4.89772 9.6098 4.82401 9.57224 4.74428 9.56185L1.76561 9.17248C1.57394 9.14745 1.43888 8.97175 1.46393 8.78007C1.46951 8.73737 1.48295 8.69601 1.50354 8.65815L2.93937 6.0195C2.9778 5.94886 2.99075 5.86714 2.97602 5.78811L2.42585 2.83492C2.39045 2.64489 2.5158 2.46214 2.70583 2.42674C2.7482 2.41884 2.79167 2.41884 2.83403 2.42674L5.78723 2.9769C5.86629 2.99162 5.94802 2.97869 6.0186 2.94025L8.65725 1.50443C8.82706 1.41203 9.03963 1.47478 9.13197 1.64457C9.15262 1.68243 9.16603 1.72376 9.17158 1.7665L9.56095 4.74516C9.57139 4.82489 9.60896 4.8986 9.66729 4.9539L11.8483 7.01969C11.9886 7.15263 11.9946 7.37418 11.8617 7.51453C11.832 7.54579 11.7969 7.57134 11.758 7.58984L9.0454 8.88064C8.97278 8.91517 8.91427 8.97368 8.87973 9.04624ZM9.34453 10.1704L10.1695 9.34544L12.6444 11.8203L11.8194 12.6452L9.34453 10.1704Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

/** "Topics I'm expert" section eyebrow (`327:1520` "mic-ai-fill"). */
export function MicAiFillIcon({ className }: IconProps) {
  return (
    <svg className={className ?? 'size-3.5'} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M11.9393 4.48804L12.0831 4.15806C12.3395 3.56969 12.8013 3.10124 13.3775 2.84496L13.8206 2.64788C14.0602 2.54131 14.0602 2.19264 13.8206 2.08607L13.4023 1.9C12.8113 1.63713 12.3412 1.15134 12.0892 0.542983L11.9415 0.186395C11.8386 -0.0621316 11.4954 -0.0621316 11.3924 0.186395L11.2447 0.542983C10.9928 1.15134 10.5227 1.63713 9.93169 1.9L9.51332 2.08607C9.27375 2.19264 9.27375 2.54131 9.51332 2.64788L9.95648 2.84496C10.5327 3.10124 10.9945 3.56969 11.2508 4.15806L11.3946 4.48804C11.4999 4.72962 11.8341 4.72962 11.9393 4.48804ZM8.39268 3.11429C8.55257 3.36731 8.77115 3.55428 9.04847 3.67519L9.37822 3.81896C9.59995 3.91562 9.7795 4.05139 9.91687 4.22627V5.83333C9.91687 7.44415 8.61102 8.75 7.00021 8.75C5.38935 8.75 4.08352 7.44415 4.08352 5.83333V3.5C4.08352 1.88917 5.38935 0.583333 7.00021 0.583333C7.65587 0.583333 8.26108 0.799715 8.74822 1.16497C8.60817 1.26979 8.48963 1.39891 8.39268 1.55233C8.24224 1.79047 8.16699 2.0508 8.16699 2.33332C8.16699 2.61583 8.24224 2.87616 8.39268 3.11429ZM1.89628 7.06836C1.81349 6.72502 2.09098 6.41667 2.44417 6.41667C2.73913 6.41667 2.98466 6.63532 3.06295 6.91971C3.53863 8.64753 5.1212 9.91667 7.00021 9.91667C8.87917 9.91667 10.4617 8.64752 10.9374 6.91969C11.0157 6.63532 11.2612 6.41667 11.5562 6.41667C11.9094 6.41667 12.1869 6.72501 12.1041 7.06835C11.593 9.18833 9.79529 10.8068 7.58354 11.0513V12.8333C7.58354 13.1555 7.32237 13.4167 7.00021 13.4167C6.67804 13.4167 6.41687 13.1555 6.41687 12.8333V11.0513C4.20509 10.8068 2.40743 9.18834 1.89628 7.06836Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

/** "Superpower(s)" section eyebrow (`327:1291` "flashlight-fill"). */
export function FlashlightFillIcon({ className }: IconProps) {
  return (
    <svg className={className ?? 'size-3.5'} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M7.58398 5.53325C7.58398 5.69894 7.7183 5.83325 7.88398 5.83325H11.0947C11.3367 5.83325 11.4792 6.10505 11.3414 6.30401L6.96398 12.627C6.79656 12.8688 6.41732 12.7503 6.41732 12.4562V8.46659C6.41732 8.3009 6.283 8.16659 6.11732 8.16659H2.90655C2.66456 8.16659 2.52215 7.89479 2.6599 7.69582L7.03733 1.37287C7.20474 1.13105 7.58398 1.24952 7.58398 1.54363V5.53325Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

/** "What can I help with" section eyebrow (`327:1302` "bag"). */
export function BagIcon({ className }: IconProps) {
  return (
    <svg className={className ?? 'size-3'} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M9.5 3H8V2.5C8 1.95 7.55 1.5 7 1.5H5C4.45 1.5 4 1.95 4 2.5V3H2.5C1.65 3 1 3.65 1 4.5V9C1 9.85 1.65 10.5 2.5 10.5H9.5C10.35 10.5 11 9.85 11 9V4.5C11 3.65 10.35 3 9.5 3ZM5 2.5H7V3H5V2.5ZM10 9C10 9.3 9.8 9.5 9.5 9.5H2.5C2.2 9.5 2 9.3 2 9V6.2L4.35 7C4.4 7 4.45 7 4.5 7H7.5C7.55 7 7.6 7 7.65 6.95L10 6.15V9Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

/** "Reviews" section eyebrow (`327:1320` "Review" group — a chat-bubble + sparkle glyph, not a
 * named Figma component instance like the other four, just a raw two-path vector group). */
export function ReviewChatIcon({ className }: IconProps) {
  return (
    <svg className={className ?? 'size-3'} viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path
        d="M10.4182 4.49937L9.555 4.84806C9.44387 4.89312 9.32706 4.91588 9.20806 4.91588C8.953 4.91588 8.70625 4.80825 8.53169 4.62056C8.358 4.43419 8.26831 4.18087 8.28625 3.92581L8.35144 2.99744L7.7525 2.28519C7.6195 2.12681 7.553 1.933 7.54381 1.73438H1.86812C0.84 1.73438 0 2.57437 0 3.60687V8.81313C0 9.84562 0.84 10.6813 1.86812 10.6813H3.29L3.25937 11.5519C3.25062 11.9062 3.43875 12.23 3.75375 12.3962C3.88937 12.4662 4.03375 12.5013 4.1825 12.5013C4.375 12.5013 4.5675 12.4356 4.72937 12.3131L6.89937 10.6813H9.40187C10.43 10.6813 11.27 9.84562 11.27 8.81313V4.84369L10.4182 4.49937ZM5.85244 7.59688H3.556C3.33856 7.59688 3.16225 7.42056 3.16225 7.20312C3.16225 6.98569 3.33856 6.80937 3.556 6.80937H5.85244C6.06987 6.80937 6.24619 6.98569 6.24619 7.20312C6.24619 7.42056 6.06987 7.59688 5.85244 7.59688ZM7.88812 5.608H3.55687C3.33944 5.608 3.16312 5.43169 3.16312 5.21425C3.16312 4.99681 3.33944 4.8205 3.55687 4.8205H7.88812C8.10556 4.8205 8.28187 4.99681 8.28187 5.21425C8.28187 5.43169 8.10556 5.608 7.88812 5.608Z"
        fill="#79B9E3"
      />
      <path
        d="M10.6449 0.126328L11.2789 1.14089L12.4396 1.43008C12.6321 1.4782 12.7078 1.71095 12.5804 1.8632L11.8113 2.77933L11.8949 3.97239C11.9089 4.17014 11.7107 4.31452 11.5265 4.24014L10.4174 3.7917L9.30839 4.24014C9.12464 4.31452 8.92601 4.17058 8.94001 3.97239L9.02357 2.77933L8.25445 1.8632C8.1267 1.71139 8.20282 1.4782 8.39532 1.43008L9.55601 1.14089L10.1899 0.126328C10.2945 -0.0421094 10.5399 -0.0421094 10.6449 0.126328Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

/** Roles accordion — EXPANDED-row toggle glyph (`327:1138` "indeterminate-circle-fill", a
 * filled circle with a "−"). Real hardcoded Figma brand blue — see file header for why this
 * one (unlike `AddCircleFillIcon`) is NOT `currentColor`. */
export function IndeterminateCircleFillIcon({ className }: IconProps) {
  return (
    <svg className={className ?? 'size-6'} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16.0003 29.3334C8.63653 29.3334 2.66699 23.3638 2.66699 16C2.66699 8.63622 8.63653 2.66669 16.0003 2.66669C23.3641 2.66669 29.3337 8.63622 29.3337 16C29.3337 23.3638 23.3641 29.3334 16.0003 29.3334ZM10.667 14.6667C9.93061 14.6667 9.33366 15.2636 9.33366 16C9.33366 16.7364 9.93061 17.3334 10.667 17.3334H21.3337C22.07 17.3334 22.667 16.7364 22.667 16C22.667 15.2636 22.07 14.6667 21.3337 14.6667H10.667Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

/** Roles accordion — COLLAPSED-row toggle glyph (`327:1179` "add-circle-fill", a filled circle
 * with a "+"). `currentColor` (see file header) — the caller sets its color via CSS rather than
 * inheriting Figma's raw white fill, which only reads on that mockup's dark background. */
export function AddCircleFillIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16.0003 29.3333C8.63653 29.3333 2.66699 23.3637 2.66699 16C2.66699 8.63616 8.63653 2.66663 16.0003 2.66663C23.3641 2.66663 29.3337 8.63616 29.3337 16C29.3337 23.3637 23.3641 29.3333 16.0003 29.3333ZM14.667 14.6666H10.667C9.93061 14.6666 9.33366 15.2636 9.33366 16C9.33366 16.7363 9.93061 17.3333 10.667 17.3333H14.667V21.3333C14.667 22.0697 15.2639 22.6666 16.0003 22.6666C16.7367 22.6666 17.3337 22.0697 17.3337 21.3333V17.3333H21.3337C22.07 17.3333 22.667 16.7363 22.667 16C22.667 15.2636 22.07 14.6666 21.3337 14.6666H17.3337V10.6666C17.3337 9.93025 16.7367 9.33329 16.0003 9.33329C15.2639 9.33329 14.667 9.93025 14.667 10.6666V14.6666Z" />
    </svg>
  );
}

/** Per-role "Click the link to learn more" row icon (`327:1143`/`187:4803` "link" — a
 * chain-link glyph, distinct enough from `lucide-react`'s `Link2` silhouette to warrant the
 * same "pull the real vector" treatment as everything else in this file, since this component
 * was already being rebuilt for the accordion). Hardcoded brand blue, same as the eyebrows
 * above — Figma never varies this glyph's color either. */
export function RoleLinkIcon({ className }: IconProps) {
  return (
    <svg className={className ?? 'size-4'} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.66623 11.7L5.48623 12.8467C5.17681 13.1561 4.75715 13.3299 4.31957 13.3299C3.88198 13.3299 3.46232 13.1561 3.1529 12.8467C2.84348 12.5373 2.66965 12.1176 2.66965 11.68C2.66965 11.2424 2.84348 10.8228 3.1529 10.5134L6.17957 7.48002C6.47664 7.18198 6.87691 7.00954 7.29757 6.99837C7.71824 6.98721 8.1271 7.13817 8.43957 7.42002L8.51957 7.48669C8.64599 7.61046 8.81639 7.67894 8.9933 7.67706C9.17021 7.67518 9.33913 7.60311 9.4629 7.47669C9.58667 7.35027 9.65514 7.17986 9.65327 7.00295C9.65139 6.82604 9.57932 6.65712 9.4529 6.53336C9.41527 6.48471 9.37522 6.43798 9.3329 6.39336C8.7638 5.89823 8.02779 5.63792 7.27394 5.66515C6.5201 5.69239 5.80479 6.00513 5.2729 6.54002L2.20623 9.57336C1.68514 10.1406 1.40331 10.8871 1.41962 11.6572C1.43592 12.4272 1.74909 13.1612 2.29372 13.7059C2.83835 14.2505 3.57234 14.5637 4.3424 14.58C5.11245 14.5963 5.85904 14.3145 6.42623 13.7934L7.57957 12.6667C7.69344 12.5425 7.75604 12.3797 7.75477 12.2112C7.7535 12.0427 7.68845 11.8809 7.57271 11.7584C7.45696 11.6359 7.29912 11.5617 7.13094 11.5509C6.96276 11.5401 6.79672 11.5934 6.66623 11.7ZM13.7929 2.20669C13.2321 1.64936 12.4735 1.33655 11.6829 1.33655C10.8922 1.33655 10.1337 1.64936 9.5729 2.20669L8.41957 3.33336C8.30569 3.45759 8.24309 3.62034 8.24436 3.78887C8.24563 3.95739 8.31068 4.11918 8.42642 4.24168C8.54217 4.36418 8.70001 4.4383 8.86819 4.44912C9.03637 4.45995 9.20241 4.40667 9.3329 4.30002L10.4862 3.15336C10.7957 2.84394 11.2153 2.67011 11.6529 2.67011C12.0905 2.67011 12.5101 2.84394 12.8196 3.15336C13.129 3.46277 13.3028 3.88244 13.3028 4.32002C13.3028 4.75761 13.129 5.17727 12.8196 5.48669L9.7929 8.52002C9.49582 8.81806 9.09555 8.9905 8.67489 9.00167C8.25423 9.01284 7.84537 8.86188 7.5329 8.58002L7.4529 8.51336C7.32648 8.38959 7.15607 8.32111 6.97916 8.32298C6.80225 8.32486 6.63333 8.39694 6.50957 8.52336C6.3858 8.64978 6.31732 8.82018 6.31919 8.99709C6.32107 9.174 6.39315 9.34292 6.51957 9.46669C6.56799 9.51621 6.61918 9.56296 6.6729 9.60669C7.24268 10.1003 7.97838 10.3597 8.73177 10.3324C9.48515 10.3052 10.2002 9.99348 10.7329 9.46002L13.7662 6.42669C14.3271 5.86941 14.6447 5.11284 14.6497 4.32219C14.6547 3.53153 14.3467 2.77102 13.7929 2.20669Z"
        fill="#79B9E3"
      />
    </svg>
  );
}
