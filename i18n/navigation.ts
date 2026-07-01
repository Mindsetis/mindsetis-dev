import { createNavigation } from 'next-intl/navigation';

import { routing } from '@/i18n/routing';

/**
 * Locale-aware navigation helpers (wrap next/link, next/navigation).
 * Use these instead of the plain Next.js equivalents in app/[locale]/**.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
