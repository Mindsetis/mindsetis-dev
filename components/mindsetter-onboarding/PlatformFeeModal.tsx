'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type PlatformFeeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Fired only when the caller ticks the consent box and presses "I agree — continue setup".
   * NOTE (onboarding doc section D / spec §5.9): the Stripe Connect backend is a separate,
   * not-yet-built later stage — this modal is purely informational/consent UI. Agreeing here
   * just closes the modal; no `session_terms_accepted`-style flag is persisted anywhere yet,
   * since there's no real payout flow on the other end of it to gate. Revisit once Stripe
   * Connect onboarding (§5.9) exists and decide whether/where consent should be recorded.
   */
  onAgree: () => void;
};

const TABLE_ROW_KEYS = ['sessionPrice', 'platformFee', 'youReceive'] as const;
const INFO_KEYS = ['payout', 'changeAnytime', 'cancellation'] as const;

/**
 * "Platform fee & payouts" info modal (onboarding doc section 5's nested modal) — opened from
 * the "How it works" card on the Personal-session step (`SessionForm.tsx`). Container chrome
 * (bottom sheet mobile / centered rounded desktop modal, custom close X) copies
 * `WhoIsMindsetterDialog`'s established pattern verbatim, per the build prompt's explicit
 * instruction to match that styling.
 */
export function PlatformFeeModal({ open, onOpenChange, onAgree }: PlatformFeeModalProps) {
  const t = useTranslations('mindsetterOnboarding.session.feeModal');
  const [agreed, setAgreed] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setAgreed(false);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={[
          'top-auto right-0 bottom-0 left-0 max-h-[85vh] w-full max-w-none translate-x-0',
          'translate-y-0 gap-4 overflow-y-auto rounded-t-[32px] rounded-b-none border-0',
          'border-t border-t-[#a5a5a5] px-4 pt-6 pb-6',
          'md:top-[50%] md:right-auto md:bottom-auto md:left-[50%] md:max-w-[600px]',
          'md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-[30px] md:border-0 md:p-8',
        ].join(' ')}
      >
        <DialogClose asChild>
          <button
            type="button"
            className="absolute top-6 right-6 flex size-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-input transition-colors hover:border-primary hover:text-primary"
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">{t('close')}</span>
          </button>
        </DialogClose>

        <DialogHeader className="gap-0 pr-10 text-left">
          <DialogTitle className="text-[22px] text-primary">{t('title')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 rounded-[16px] border border-border bg-card p-4">
          {TABLE_ROW_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">{t(`table.${key}.label`)}</span>
              <span
                className={cn(
                  'text-sm font-bold',
                  key === 'youReceive' ? 'text-primary' : 'text-foreground',
                )}
              >
                {t(`table.${key}.value`)}
              </span>
            </div>
          ))}
          <p className="mt-1 text-tiny text-muted-foreground">{t('table.note')}</p>
        </div>

        <div className="flex flex-col gap-3">
          {INFO_KEYS.map((key) => (
            <div key={key} className="flex flex-col gap-0">
              <h3 className="text-base font-bold text-foreground">{t(`info.${key}.title`)}</h3>
              <p className="text-[12px] text-muted-foreground md:text-sm">
                {t(`info.${key}.body`)}
              </p>
            </div>
          ))}
        </div>

        <label className="flex items-start gap-3 rounded-[16px] border border-border bg-card p-4">
          <Checkbox checked={agreed} onCheckedChange={setAgreed} className="mt-0.5" />
          <span className="text-sm text-foreground">
            {t.rich('consent', {
              // Session Terms placeholder destination — no dedicated legal page yet (same
              // "wire ahead of the real destination" precedent as other stub links this
              // onboarding wizard already uses, e.g. `roles/page.tsx`'s profile preview link).
              terms: (chunks) => (
                <Link href="/" className="text-primary underline">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>

        <Button
          type="button"
          variant="primaryOutline"
          size="lg"
          disabled={!agreed}
          onClick={() => {
            onAgree();
            setAgreed(false);
          }}
        >
          {t('agree')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
