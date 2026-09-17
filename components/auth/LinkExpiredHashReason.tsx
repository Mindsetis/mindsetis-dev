'use client';

import { useEffect } from 'react';

import { useRouter } from '@/i18n/navigation';

/**
 * Reads the error Supabase left in the URL fragment and re-renders the page with the right copy.
 *
 * WHY A CLIENT COMPONENT FOR THIS
 *   The real confirmation email links to Supabase's own `/auth/v1/verify`. When that rejects a
 *   dead link it 303s to our redirect target with no token and no query parameters at all —
 *   the reason travels in the fragment:
 *
 *     /link-expired#error=access_denied&error_code=otp_expired&error_description=…
 *
 *   A fragment is never sent to the server, so `/api/auth/confirm` cannot classify this case and
 *   deliberately leaves `?reason` off (see that route). The browser CAN read it, so the last
 *   step happens here.
 *
 * It also cleans the fragment out of the address bar, which is worth doing on its own: nobody
 * needs `#error=access_denied&error_description=Email+link+is+invalid+or+has+expired` sitting in
 * the URL of a page whose whole job is to explain that calmly.
 *
 * Renders nothing. When there is no fragment — someone opened `/link-expired` directly, or the
 * server already knew the reason — this does nothing at all.
 */
export function LinkExpiredHashReason() {
  const router = useRouter();

  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    if (!fragment) return;

    const params = new URLSearchParams(fragment);
    const code = params.get('error_code') ?? params.get('error');
    if (!code) return;

    const reason = code === 'otp_expired' || code === 'access_denied' ? 'expired' : 'invalid';
    // `replace`, not `push`: this is a correction of the current URL, not a step the visitor
    // took, and Back should return them to their mail client rather than to the fragment.
    router.replace(`/link-expired?reason=${reason}`);
  }, [router]);

  return null;
}
