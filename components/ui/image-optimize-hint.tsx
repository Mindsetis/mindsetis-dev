'use client';

import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { cn } from '@/lib/utils';

export type ImageOptimizeHintProps = {
  /** The limit the file blew past, in MB — interpolated into the prompt. */
  maxSizeMb: number;
  className?: string;
};

/**
 * Shown under a photo field when the picked file is over the size limit: a ready-made prompt the
 * member can paste into any AI chat, together with their photo, to get a compressed version back.
 *
 * Sits BESIDE the error rather than inside it (2026-08-14 request). The error line itself stays
 * short — on the avatar dropzone it doubles as the box's headline, where a multi-sentence prompt
 * would wreck the layout — and this block carries the long copy plus a Copy button, which is the
 * whole point: a prompt you have to retype by hand is a prompt nobody uses.
 *
 * Deliberately generic about WHICH assistant: the copy says "your favourite AI" and the prompt is
 * plain text with no tool-specific syntax, so it works pasted anywhere.
 */
export function ImageOptimizeHint({ maxSizeMb, className }: ImageOptimizeHintProps) {
  const t = useTranslations('common.imageOptimize');
  const [copied, setCopied] = useState(false);

  const prompt = t('prompt', { maxSizeMb });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure origin, denied permission) — the prompt is still on screen
      // and selectable, so there is nothing to recover from and nothing worth alarming about.
    }
  };

  return (
    <div className={cn('flex flex-col gap-2 rounded-xl border border-[#2a2a2a] p-3', className)}>
      <p className="text-tiny text-muted-foreground">{t('intro')}</p>

      <p className="rounded-lg bg-card p-3 text-tiny text-foreground select-all">{prompt}</p>

      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-tiny font-bold text-primary transition-colors hover:text-primary-hover"
      >
        {copied ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
        {copied ? t('copied') : t('copy')}
      </button>
    </div>
  );
}
