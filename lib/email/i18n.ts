import 'server-only';

// `next-intl`'s package root is React-tree-aware (its `.`/react-server export
// conditionally pulls in React Server/Client Component wiring, e.g.
// `NextIntlClientProvider`) — appropriate for `getTranslations`/`useTranslations`, but
// unnecessary and occasionally fragile for a plain, request-context-free string
// translator. `use-intl/core` (the pure ICU-message engine `next-intl` itself is built
// on, and which `next-intl` re-exports) has no React dependency at all, which is exactly
// what a template renderer needs. `use-intl` is `next-intl`'s own dependency (declared
// explicitly here at the matching version) rather than an undeclared transitive one.
import { createTranslator } from 'use-intl/core';

import type { EmailLocale } from '@/lib/validation/email';
import en from '@/messages/en.json';
import es from '@/messages/es.json';

const dictionaries = { en, es } satisfies Record<EmailLocale, typeof en>;

/**
 * Build an ICU-aware translator scoped to the `email` namespace, without depending on
 * request context. `getTranslations`/`useTranslations` both require an active Next.js
 * request (RSC render or client tree), but templates must also render OUTSIDE one —
 * e.g. a future `pg_cron`-triggered reminder job calling `enqueueEmail` with no request
 * in flight. `createTranslator` builds the same translator straight from a plain messages
 * object + locale, so email copy lives in the same `messages/en.json` /
 * `messages/es.json` dictionaries as the rest of the UI (single source of truth) instead
 * of a second, template-local copy of the strings.
 */
export function getEmailTranslator(locale: EmailLocale) {
  const messages = dictionaries[locale] ?? dictionaries.en;
  return createTranslator({ locale, messages, namespace: 'email' });
}

export type EmailTranslator = ReturnType<typeof getEmailTranslator>;
