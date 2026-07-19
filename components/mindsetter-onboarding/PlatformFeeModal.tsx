'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
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

/** Info icon (12×12, `#A5A5A5`) to the left of the "Example for a $500 session…" note —
 * provided verbatim by the designer. */
function FeeNoteInfoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M6 11C3.23857 11 1 8.7614 1 6C1 3.23857 3.23857 1 6 1C8.7614 1 11 3.23857 11 6C11 8.7614 8.7614 11 6 11ZM6 5.5C5.72386 5.5 5.5 5.72386 5.5 6V8C5.5 8.27614 5.72386 8.5 6 8.5C6.27614 8.5 6.5 8.27614 6.5 8V6C6.5 5.72386 6.27614 5.5 6 5.5ZM6 3.5C5.72386 3.5 5.5 3.72386 5.5 4C5.5 4.27614 5.72386 4.5 6 4.5C6.27614 4.5 6.5 4.27614 6.5 4C6.5 3.72386 6.27614 3.5 6 3.5Z"
        fill="#A5A5A5"
      />
    </svg>
  );
}

/** Consent checkbox — unchecked (32×32, white ring) — provided verbatim by the designer,
 * replacing the shared `Checkbox` component for this one field (not used elsewhere). */
function ConsentUncheckedIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16.0013 29.3327C8.6375 29.3327 2.66797 23.3631 2.66797 15.9993C2.66797 8.63555 8.6375 2.66602 16.0013 2.66602C23.365 2.66602 29.3346 8.63555 29.3346 15.9993C29.3346 23.3631 23.365 29.3327 16.0013 29.3327ZM16.0013 26.666C21.8924 26.666 26.668 21.8904 26.668 15.9993C26.668 10.1083 21.8924 5.33268 16.0013 5.33268C10.1103 5.33268 5.33464 10.1083 5.33464 15.9993C5.33464 21.8904 10.1103 26.666 16.0013 26.666Z"
        fill="white"
      />
    </svg>
  );
}

/** Consent checkbox — checked (32×32, blue filled + tick) — provided verbatim by the designer. */
function ConsentCheckedIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16.0013 2.66602C8.66797 2.66602 2.66797 8.66602 2.66797 15.9993C2.66797 23.3327 8.66797 29.3327 16.0013 29.3327C23.3346 29.3327 29.3346 23.3327 29.3346 15.9993C29.3346 8.66602 23.3346 2.66602 16.0013 2.66602ZM21.6013 13.7327L15.2013 20.1327C14.668 20.666 13.868 20.666 13.3346 20.1327L10.4013 17.1993C9.86797 16.666 9.86797 15.866 10.4013 15.3327C10.9346 14.7993 11.7346 14.7993 12.268 15.3327L14.268 17.3327L19.7346 11.866C20.268 11.3327 21.068 11.3327 21.6013 11.866C22.1346 12.3993 22.1346 13.1993 21.6013 13.7327Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

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
          'md:top-[50%] md:right-auto md:bottom-auto md:left-[50%] md:max-w-[800px]',
          'md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-[32px] md:border-0 md:p-8',
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

        <DialogHeader className="gap-0 border-b border-border pr-10 pb-4 text-left">
          <DialogTitle className="text-[22px] text-primary">{t('title')}</DialogTitle>
          <DialogDescription className="text-tiny">{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 border-b border-border pb-4 md:gap-1">
          {TABLE_ROW_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-base font-bold text-white">{t(`table.${key}.label`)}</span>
              <span
                className={cn(
                  'text-base font-bold',
                  key === 'sessionPrice' ? 'text-[#79b9e3]' : 'text-white',
                )}
              >
                {t(`table.${key}.value`)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-[-8px] flex items-center gap-1 border-b border-border pb-2">
          <FeeNoteInfoIcon />
          <span className="text-[12px] font-normal text-[#a5a5a5]">{t('table.note')}</span>
        </div>

        <div className="flex flex-col gap-3">
          {INFO_KEYS.map((key) => (
            <div key={key} className="flex flex-col gap-0">
              <h3 className="text-base font-bold text-[#79b9e3]">{t(`info.${key}.title`)}</h3>
              <p className="text-[12px] text-muted-foreground md:text-sm">
                {t(`info.${key}.body`)}
              </p>
            </div>
          ))}
        </div>

        <label className="flex items-center gap-4 rounded-[8px] border border-border bg-[#000] p-4">
          <button
            type="button"
            role="checkbox"
            aria-checked={agreed}
            onClick={(event) => {
              event.preventDefault();
              setAgreed((prev) => !prev);
            }}
            className="shrink-0 cursor-pointer"
          >
            {agreed ? <ConsentCheckedIcon /> : <ConsentUncheckedIcon />}
          </button>
          <span className="text-tiny text-foreground">
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
          className="mt-2 md:mt-0"
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
