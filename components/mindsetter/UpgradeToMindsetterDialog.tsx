'use client';

import { useTranslations } from 'next-intl';
import type { RefObject } from 'react';

import { useUnsavedChanges } from '@/components/dashboard/unsaved-changes';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRouter } from '@/i18n/navigation';

/**
 * Bullet order and meaning both come from the Figma frame (2026-09-21 copy decision, see the
 * doc comment below) — not just different wording, different content: the old `profile` bullet
 * (public profile page) is gone from the design and `invites` is new, so the keys were renamed
 * rather than re-worded in place. Renaming them is what keeps a key from describing something
 * the string no longer says.
 */
const POINT_KEYS = ['events', 'consultations', 'invites'] as const;

type UpgradeToMindsetterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The button that opened this dialog, so focus can go back to it on close. Optional: when it is
   * absent (or was never populated) Radix's own default runs untouched — see `onCloseAutoFocus`
   * below and the longer explanation in `UpgradeToMindsetterTrigger`.
   */
  triggerRef?: RefObject<HTMLButtonElement | null>;
};

/**
 * "Upgrade to Mindsetter" confirmation modal (Release-1 C7). Rendered by the shared
 * `UpgradeToMindsetterTrigger` (button + this dialog in one), which is what the site header's
 * "Upgrade" CTA, the "What is Mindsetis" landing section, and the cabinet's `MemberStatusBanner`
 * (C5) all actually place — none of those three render this component directly. All three used
 * to be a plain `GuardedLink` straight to `/mindsetter-onboarding/roles`; this now sits in front
 * of that navigation everywhere.
 *
 * LAYOUT RECONCILED AGAINST FIGMA (2026-09-21): the design frame "Modal · Upgrade to Mindsetter"
 * (`1512:18532`, 480×~438, desktop-only — no separate 375px mock exists for this dialog) landed
 * after this component originally shipped without one. Measured against it:
 *   - Modal: `rounded-[20px]` (Figma cornerRadius 20 — no exact token, same one-off value
 *     `CabinetHeader` already uses), `p-8` (32px, exact), `gap-5` (20px between every major
 *     block — header / bullet list / note / footer, all measured the same). `border-border` /
 *     `bg-card` already matched the shared `DialogContent` defaults exactly, untouched.
 *   - Title: Figma's "M (PC)" style, 22px/29px — `text-m leading-[29px]` (same pairing
 *     `AmbassadorsRegionCarousel` already uses for this token), not the shared `DialogTitle`
 *     default (`text-l`, 32px) which is too large for this frame.
 *   - Subtitle: Figma's "body (PC)" style, 16px — `text-body`, not the shared `DialogDescription`
 *     default (`text-sm`, 14px stock Tailwind, no matching token here).
 *   - Bullets: Figma draws a plain 5px grey dot per line (`bg-border`, i.e. the exact
 *     `--color-border` token, 10px gap to the text), not a checkmark — swapped the `lucide-react`
 *     `Check` icon for a dot to match; the bullet TEXT itself is untouched (see the copy note
 *     below).
 *   - Footer: Figma stacks BOTH buttons full-width, primary on top, "Maybe later"-equivalent
 *     below, 10px apart, at the modal's one (480px) width — not the shared `DialogFooter` default
 *     (row, right-aligned, only at `sm:`+). Overridden to `flex-col` at every breakpoint with
 *     `w-full` buttons; DOM order now matches the visual order (primary first).
 *   - Close button: Figma draws an outlined dark-grey circle (`#000` fill, `#747474` border/glyph)
 *     at the content's own 32px inset, flush with the header row — NOT the shared
 *     `DialogCloseButton`'s current blue-disc/black-glyph styling. Deliberately NOT changed to
 *     match: that blue-disc treatment was a documented, cross-surface product decision
 *     (`components/ui/dialog.tsx`, "2026-08-14 request, replacing the previous outlined dark
 *     circle") already applied to four+ other dialogs/sheets app-wide, and this one Figma frame
 *     predating or simply missing that pass is a far more likely explanation than a fresh
 *     per-modal reversal — flagging this conflict rather than silently reintroducing the old
 *     style here alone. Only its POSITION was adjusted (`top-8 right-8`, `showCloseButton={false}`
 *     + a manually placed `DialogCloseButton`) to sit flush with this modal's `p-8` padding instead
 *     of the shared default's fixed `top-4 right-4` inset, which — with this modal's larger 32px
 *     padding — would otherwise float visibly closer to the corner than every other block of
 *     content.
 *
 * COPY NOW COMES FROM FIGMA (owner decision, 2026-09-21). Every string below was previously an
 * explicit PLACEHOLDER — the client had never sent wording for this modal. The design frame
 * `1512:18532` does carry finished copy, and the owner chose it over our draft, so
 * `upgradeToMindsetter.*` (`messages/en.json`) was replaced with the frame's text verbatim,
 * read out of Figma's text nodes rather than retyped. `title` was already identical and is
 * unchanged. Structural consequences, not just new wording:
 *   - `intro` is a NEW key — the frame has a lead-in line above the bullets ("As a Mindsetter,
 *     you unlock premium privileges:") that this component had no equivalent of.
 *   - The bullets changed MEANING, so their keys were renamed (see `POINT_KEYS` above) — the
 *     public-profile bullet is gone from the design, an invite-your-network one is new.
 *   - `continue`/`notNow` became `start`/`maybeLater`, because "Start Mindsetter Application" /
 *     "Maybe later" no longer match what the old key names claimed.
 * The Spanish side was translated to match; it is our translation, not the client's, and is
 * worth a native read before release.
 *
 * NAVIGATION ORDER MATTERS (2026-09-20) — same class of bug already fixed once in
 * `components/layout/AccountMenu.tsx` (see its "Log out" item's own comment): opening the
 * unsaved-changes `AlertDialog` in the SAME tick this dialog closes lets the two Radix dialogs
 * race over `document.body`'s `pointer-events`, which can leave it welded to `none` and the page
 * unclickable until a reload. "Continue" therefore closes THIS dialog first (`onOpenChange(false)`)
 * and only THEN, one frame later (`requestAnimationFrame`), calls `guard(...)` to route away — by
 * the time the guard's own dialog (if the visitor is mid-edit somewhere) can open, this one has
 * already finished unmounting and released the body. "Not now" carries no such risk — it only
 * ever closes this dialog, no second dialog is ever involved.
 */
export function UpgradeToMindsetterDialog({
  open,
  onOpenChange,
  triggerRef,
}: UpgradeToMindsetterDialogProps) {
  const t = useTranslations('upgradeToMindsetter');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { guard } = useUnsavedChanges();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[480px] gap-5 rounded-[20px] p-8"
        // Radix's default here focuses its own `Dialog.Trigger`, which this island has none of, so
        // focus silently landed on `<body>` and a keyboard visitor lost their place (live QA,
        // 2026-09-21). Take over only when we actually hold the button; otherwise leave Radix's
        // behaviour alone rather than preventing a default we have nothing to replace with.
        onCloseAutoFocus={(event) => {
          const trigger = triggerRef?.current;
          if (!trigger) return;
          event.preventDefault();
          trigger.focus();
        }}
      >
        <DialogHeader className="pr-13">
          <DialogTitle className="text-m leading-[29px] font-normal">{t('title')}</DialogTitle>
          <DialogDescription className="text-body text-muted-foreground">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        {/* Figma groups the lead-in line and the bullet list into ONE auto-layout child of the
            modal (`1512:18538`), 12px apart, and it is that GROUP — not either piece on its own —
            that sits in the modal's outer 20px rhythm. Hence the wrapper: rendering the two as
            separate children of `DialogContent` would inherit its `gap-5` and push the bullets
            20px off their lead-in instead of 12px. The 8px between bullets was already right. */}
        <div className="flex flex-col gap-3">
          <p className="text-body text-muted-foreground">{t('intro')}</p>

          <ul className="flex flex-col gap-2">
            {POINT_KEYS.map((key) => (
              <li key={key} className="flex items-center gap-2.5 text-body text-muted-foreground">
                <span aria-hidden="true" className="size-[5px] shrink-0 rounded-full bg-border" />
                {t(`points.${key}`)}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-tiny text-muted-foreground">{t('note')}</p>

        <DialogFooter className="flex-col gap-2.5 sm:flex-col sm:justify-normal">
          <Button
            type="button"
            variant="primary"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              requestAnimationFrame(() => {
                guard(() => router.push('/mindsetter-onboarding/roles'));
              });
            }}
          >
            {t('start')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            {t('maybeLater')}
          </Button>
        </DialogFooter>

        <DialogCloseButton label={tCommon('closeDialog')} className="absolute top-8 right-8" />
      </DialogContent>
    </Dialog>
  );
}
