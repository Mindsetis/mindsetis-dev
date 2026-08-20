'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { decodeValidationMessage } from '@/lib/validation/messages';

/**
 * Turns the encoded message a Zod rule carries (see `lib/validation/messages.ts`) into text in
 * the current locale. Render-time is the first point where a locale exists — the schemas are
 * module-level constants shared by the client resolver and the Server Actions.
 *
 * Returns the input unchanged when it isn't an encoded message. Two real cases rely on that:
 *   - `ActionError` messages ("Something went wrong.", rate-limit copy), which are their own
 *     layer and still plain English;
 *   - a key that has no entry in `messages/*.json` yet — `t.has` is checked first, so a typo or
 *     a half-finished translation degrades to the raw key instead of throwing and taking the
 *     whole form down with it.
 */
export function useValidationMessage(): (raw: string | null | undefined) => string {
  const t = useTranslations('validation');

  return useCallback(
    (raw: string | null | undefined): string => {
      if (!raw) return '';

      const decoded = decodeValidationMessage(raw);
      if (!decoded) return raw;
      if (!t.has(decoded.key)) return decoded.key;

      return t(decoded.key, decoded.values);
    },
    [t],
  );
}
