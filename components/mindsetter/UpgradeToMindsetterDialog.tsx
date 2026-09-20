'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/components/dashboard/unsaved-changes';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRouter } from '@/i18n/navigation';

const POINT_KEYS = ['profile', 'sessions', 'events'] as const;

type UpgradeToMindsetterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * "Upgrade to Mindsetter" confirmation modal (Release-1 C7). Rendered by the shared
 * `UpgradeToMindsetterTrigger` (button + this dialog in one), which is what the site header's
 * "Upgrade" CTA, the "What is Mindsetis" landing section, and the cabinet's `MemberStatusBanner`
 * (C5) all actually place — none of those three render this component directly. All three used
 * to be a plain `GuardedLink` straight to `/mindsetter-onboarding/roles`; this now sits in front
 * of that navigation everywhere.
 *
 * DRAFT COPY (2026-09-20): the client hasn't sent final wording for this modal yet — every string
 * below (`upgradeToMindsetter.*`, `messages/en.json`) is a placeholder drafted for this task, not
 * approved copy. Kept deliberately plain — title, one paragraph, three bullet points, one note,
 * two buttons — specifically so a later copy swap only needs a translation-key edit, not a layout
 * rebuild.
 *
 * PRODUCT-OWNER DECISION, 2026-09-20: this is a genuinely SEPARATE, simple modal, not a reuse of
 * `components/auth/WhoIsMindsetterDialog.tsx` (that popup's bottom-sheet-on-mobile chrome,
 * checklist card and three-feature layout are its own thing, built for a different spot in the
 * app). This renders `DialogContent`'s own default centered-modal styling untouched — no bespoke
 * mobile positioning — because there is no design frame for this modal to match yet either.
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
export function UpgradeToMindsetterDialog({ open, onOpenChange }: UpgradeToMindsetterDialogProps) {
  const t = useTranslations('upgradeToMindsetter');
  const router = useRouter();
  const { guard } = useUnsavedChanges();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-3">
          {POINT_KEYS.map((key) => (
            <li key={key} className="flex items-start gap-2 text-sm text-foreground">
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              {t(`points.${key}`)}
            </li>
          ))}
        </ul>

        <p className="text-sm text-muted-foreground">{t('note')}</p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('notNow')}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              onOpenChange(false);
              requestAnimationFrame(() => {
                guard(() => router.push('/mindsetter-onboarding/roles'));
              });
            }}
          >
            {t('continue')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
